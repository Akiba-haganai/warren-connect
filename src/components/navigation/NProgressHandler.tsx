import { useEffect } from "react";
import { useNavigation } from "react-router-dom";
import nprogress from "nprogress";
import "nprogress/nprogress.css";

// Configure nprogress globally
nprogress.configure({ showSpinner: false, speed: 400 });

export default function NProgressHandler() {
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === "loading" || navigation.state === "submitting") {
      nprogress.start();
    } else {
      nprogress.done();
    }
  }, [navigation.state]);

  return null;
}
