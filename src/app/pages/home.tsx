import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/pixelact-ui/card";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import emailjs from '@emailjs/browser';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "../ui/Navbar";

const Home = () => {
  const form = useRef<HTMLFormElement>(null);
  const [showSend, setShowSend] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  const showNotification = (text: string) => {
    setNotificationText(text);
    setShowSend(true);
    setTimeout(() => {
      setShowSend(false);
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    emailjs
      .sendForm(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        form.current!,
        { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY }
      )
      .then(
        () => {
          showNotification('Successfully joined the waitlist!');
          if (form.current) {
            form.current.reset();
          }
        },
        () => {
          showNotification('Failed to join the waitlist. Please try again later.');
        }
      );
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      {showSend && (
        <Alert className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-max">
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>{notificationText}</AlertDescription>
        </Alert>
      )}

      <Navbar />

      <div className="flex-1 w-full flex flex-col items-center justify-start pt-10 pb-40 px-4">
        <div className="w-full max-w-3xl mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <Card>
            <form ref={form} onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Join The Waitlist!</CardTitle>
                <CardDescription>
                  GitGarden turns your coding activity into a living pixel art character.
                  Customize everything from hair to gear. It'll be a free application releasing in a few days.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Input type="email" placeholder="Email" className="w-full" name="email" />
                <Button type="submit">Submit</Button>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-3">
                <p className="text-xs text-gray-500 flex items-center">
                  <Icon icon="pixelarticons:info-box" className="w-4 h-4 mr-1 shrink-0" />
                  We won't use your email for anything except to notify you when GitGarden is released.
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
