import React from "react";
import Typography from "@mui/material/Typography";

export function Home() {

  return (
    <>
      <Typography variant="h2" component="h2" gutterBottom>
        Hello Team!
      </Typography>

      <Typography variant="body1" gutterBottom>
        We're thrilled to introduce your very own Fine-Tuned ChatBot—a powerful companion designed to enhance your
        day-to-day workflow. Simply select your dedicated chatbot from the options on the left, and let efficiency and
        productivity become your new best friends.
      </Typography>

      <Typography variant="body1" gutterBottom>
        Whether it's streamlining tasks, providing quick answers, or assisting with project management, your fine-tuned
        chatbot is here to make your work life smoother and more enjoyable.
      </Typography>
    </>
  );
}