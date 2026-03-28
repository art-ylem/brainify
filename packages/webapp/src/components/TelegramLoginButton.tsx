import { useEffect, useRef } from 'preact/hooks';

interface Props {
  botName: string;
  onAuth: (data: Record<string, unknown>) => void;
}

export function TelegramLoginButton({ botName, onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Expose callback globally for the widget
    const callbackName = '__brainify_tg_login';
    (window as unknown as Record<string, unknown>)[callbackName] = (data: Record<string, unknown>) => {
      onAuth(data);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };
  }, [botName, onAuth]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
