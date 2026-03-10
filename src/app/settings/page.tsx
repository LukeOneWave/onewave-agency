import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="rounded-2xl shadow-sm border-0">
        <CardHeader>
          <CardTitle>Anthropic API Key</CardTitle>
          <CardDescription>
            Enter your Anthropic API key to enable agent chat functionality.
            Your key is stored securely on the server and never exposed to the
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyForm />
        </CardContent>
      </Card>
    </div>
  );
}
