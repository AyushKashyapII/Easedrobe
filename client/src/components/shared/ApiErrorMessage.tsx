import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, RefreshCw } from "lucide-react";

type ApiErrorMessageProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
};

export function ApiErrorMessage({
  title = "API Service Unavailable",
  message = "We're having trouble connecting to our AI service. This might be due to service limits or network issues.",
  onRetry,
  showRetry = true,
}: ApiErrorMessageProps) {
  return (
    <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle className="mb-2">{title}</AlertTitle>
      <AlertDescription className="text-destructive/90">
        <p className="mb-3">{message}</p>
        {showRetry && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="mt-2 border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}