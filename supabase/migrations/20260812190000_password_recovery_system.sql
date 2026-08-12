-- ========================================================
-- Password Recovery System Migration
-- Migration Timestamp: 20260812190000
-- Features:
-- 1. password_recovery_requests table with RLS (no client INSERT policy)
-- 2. get_caller_ip() PostgREST IP extraction helper
-- 3. get_password_recovery_challenge() SECURITY DEFINER RPC
-- 4. verify_password_recovery_challenge() SECURITY DEFINER RPC
-- 5. Strict REVOKE EXECUTE FROM PUBLIC + GRANT TO anon, authenticated
-- ========================================================

-- 1. Table Creation
CREATE TABLE IF NOT EXISTS public.password_recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'verified_pending_admin' CHECK (status IN ('verified_pending_admin', 'approved', 'rejected')),
    score INTEGER NOT NULL DEFAULT 0,
    verification_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies on this table
DROP POLICY IF EXISTS "Admins can view reset requests" ON public.password_recovery_requests;
DROP POLICY IF EXISTS "Admins can update reset requests" ON public.password_recovery_requests;

-- RLS: Admins can view and update password recovery requests
CREATE POLICY "Admins can view reset requests"
    ON public.password_recovery_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update reset requests"
    ON public.password_recovery_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Notice: NO CLIENT INSERT POLICY. Inserts happen strictly inside SECURITY DEFINER RPC.

-- 2. IP Helper
CREATE OR REPLACE FUNCTION public.get_caller_ip()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.headers', true)::json->>'cf-connecting-ip',
    split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1),
    '127.0.0.1'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '127.0.0.1';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Get Challenge RPC
CREATE OR REPLACE FUNCTION public.get_password_recovery_challenge(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
    v_target_user RECORD;
    v_ip TEXT;
    v_saved_item_title TEXT;
    v_join_month TEXT;
    v_listed_category TEXT;
    
    -- Decoys
    v_saved_decoys TEXT[];
    v_month_decoys TEXT[];
    v_category_decoys TEXT[];
    
    v_q1_options TEXT[];
    v_q2_options TEXT[];
    v_q3_options TEXT[];
BEGIN
    v_ip := public.get_caller_ip();

    -- Check Rate Limit (max 3 requests per hour per IP/email)
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit'
    ) THEN
        PERFORM public.check_rate_limit(v_ip || ':' || p_email, 'password_recovery_challenge', 3, 3600);
    END IF;

    -- Lookup user (Anti-enumeration: if not found, we still return realistic decoy options!)
    SELECT id, created_at, year_of_study INTO v_target_user
    FROM public.profiles
    WHERE lower(email) = lower(p_email)
    LIMIT 1;

    -- Generic Decoy Pools
    v_month_decoys := ARRAY['January', 'March', 'June', 'September', 'November'];
    v_category_decoys := ARRAY['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Services'];
    v_saved_decoys := ARRAY['Engineering Math Textbook', 'Desk Lamp', 'Scientific Calculator', 'Single Mattress', 'Lab Coat'];

    IF v_target_user.id IS NOT NULL THEN
        -- Real Ground Truth Q1: Saved Wishlist Item Title
        SELECT p.title INTO v_saved_item_title
        FROM public.saved_items s
        JOIN public.products p ON p.id = s.product_id
        WHERE s.user_id = v_target_user.id
        LIMIT 1;

        -- Real Ground Truth Q2: Join Month
        v_join_month := to_char(v_target_user.created_at, 'Month');
        v_join_month := trim(v_join_month);

        -- Real Ground Truth Q3: Listed Product Category
        SELECT category INTO v_listed_category
        FROM public.products
        WHERE seller_id = v_target_user.id AND category IS NOT NULL
        LIMIT 1;
    END IF;

    -- Fallback to realistic decoys if user doesn't have data or doesn't exist (Anti-Enumeration)
    IF v_saved_item_title IS NULL THEN
        v_saved_item_title := 'Calculus II Textbook';
    END IF;

    IF v_join_month IS NULL THEN
        v_join_month := 'August';
    END IF;

    IF v_listed_category IS NULL THEN
        v_listed_category := 'Electronics';
    END IF;

    -- Build option arrays with correct answer included
    v_q1_options := ARRAY[
        v_saved_item_title,
        'Desk Lamp',
        'Scientific Calculator',
        'Single Mattress'
    ];
    
    v_q2_options := ARRAY[
        v_join_month,
        'February',
        'July',
        'October'
    ];

    v_q3_options := ARRAY[
        v_listed_category,
        'Clothing',
        'Services',
        'Sports Equipment'
    ];

    RETURN jsonb_build_object(
        'success', true,
        'questions', jsonb_build_array(
            jsonb_build_object(
                'id', 1,
                'type', 'saved_item',
                'question', 'Which item did you recently save to your wishlist?',
                'options', v_q1_options
            ),
            jsonb_build_object(
                'id', 2,
                'type', 'join_month',
                'question', 'Which month did you sign up for Warren Connect?',
                'options', v_q2_options
            ),
            jsonb_build_object(
                'id', 3,
                'type', 'listed_category',
                'question', 'Which category have you browsed or listed items in?',
                'options', v_q3_options
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Verify Challenge RPC
CREATE OR REPLACE FUNCTION public.verify_password_recovery_challenge(
    p_email TEXT,
    p_answers JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_target_user RECORD;
    v_score INT := 0;
    v_ans JSONB;
    v_q_type TEXT;
    v_selected_val TEXT;
    
    -- Ground truth variables
    v_real_saved_item TEXT;
    v_real_join_month TEXT;
    v_real_listed_category TEXT;
    v_request_id UUID;
BEGIN
    -- Lookup user
    SELECT id, created_at INTO v_target_user
    FROM public.profiles
    WHERE lower(email) = lower(p_email)
    LIMIT 1;

    IF v_target_user.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Verification failed. Please check your answers or contact support.'
        );
    END IF;

    -- Fetch ground-truth values live at submission time
    SELECT p.title INTO v_real_saved_item
    FROM public.saved_items s
    JOIN public.products p ON p.id = s.product_id
    WHERE s.user_id = v_target_user.id
    LIMIT 1;
    IF v_real_saved_item IS NULL THEN v_real_saved_item := 'Calculus II Textbook'; END IF;

    v_real_join_month := trim(to_char(v_target_user.created_at, 'Month'));

    SELECT category INTO v_real_listed_category
    FROM public.products
    WHERE seller_id = v_target_user.id AND category IS NOT NULL
    LIMIT 1;
    IF v_real_listed_category IS NULL THEN v_real_listed_category := 'Electronics'; END IF;

    -- Score submitted answers statelessly
    FOR v_ans IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_q_type := v_ans->>'type';
        v_selected_val := trim(v_ans->>'selected_value');

        IF v_q_type = 'saved_item' AND lower(v_selected_val) = lower(v_real_saved_item) THEN
            v_score := v_score + 1;
        ELSIF v_q_type = 'join_month' AND lower(v_selected_val) = lower(v_real_join_month) THEN
            v_score := v_score + 1;
        ELSIF v_q_type = 'listed_category' AND lower(v_selected_val) = lower(v_real_listed_category) THEN
            v_score := v_score + 1;
        END IF;
    END LOOP;

    -- Require score >= 2 to pass
    IF v_score < 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'score', v_score,
            'message', 'Identity verification score too low. Please answer accurately.'
        );
    END IF;

    -- Insert into password_recovery_requests queue as verified_pending_admin
    INSERT INTO public.password_recovery_requests (
        user_id,
        email,
        status,
        score,
        verification_details
    ) VALUES (
        v_target_user.id,
        lower(p_email),
        'verified_pending_admin',
        v_score,
        jsonb_build_object(
            'score', v_score,
            'verified_at', now()
        )
    ) RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'score', v_score,
        'request_id', v_request_id,
        'message', 'Identity verified! Your password reset request has been queued for admin approval.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Explicit Permission Lockdown
REVOKE EXECUTE ON FUNCTION public.get_caller_ip() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_password_recovery_challenge(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_password_recovery_challenge(TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_caller_ip() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_password_recovery_challenge(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_password_recovery_challenge(TEXT, JSONB) TO anon, authenticated, service_role;
