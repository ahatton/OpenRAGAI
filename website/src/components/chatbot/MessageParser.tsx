import React, { ReactElement, ReactNode, useState } from 'react';

type MessageParserProps = {
  children: ReactNode;
  actions: Record<string, any>;
};

const MessageParser = ({ children, actions }: MessageParserProps): ReactElement => {
  const parse = (message: string): void => {
    // send message to api
    actions.handleMessage(message);
  };

  return (
    <div>
      {React.Children.map(children, (child: ReactNode) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as ReactElement, {
            parse: parse,
            actions,
          });
        }
        return child;
      })}
    </div>
  );
};

export default MessageParser;