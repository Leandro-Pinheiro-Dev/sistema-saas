import { Card, CardContent } from "./ui/card";

const Footer = () => {
  return (
    /* RODAPÉ */
    <footer>
      <Card className="mt-8">
        <CardContent className="px-5 py-6">
          <p className="text-center text-sm text-gray-400">
            © 2026 <span className="font-bold">LP</span>
          </p>
        </CardContent>
      </Card>
    </footer>
  );
};

export default Footer;
