"use client";

import { useEffect } from "react";

const ScrollToResult = () => {
  useEffect(() => {
    const element = document.getElementById("resultado");

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  return null;
};

export default ScrollToResult;
