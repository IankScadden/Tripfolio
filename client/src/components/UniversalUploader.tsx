import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import AwsS3 from "@uppy/aws-s3";
import { Button } from "@/components/ui/button";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

interface UniversalUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (url: string) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  children: ReactNode;
}

export function UniversalUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: UniversalUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          const res = await fetch("/api/objects/upload", {
            method: "POST",
            credentials: "include",
          });
          const response = await res.json();

          if (response.uploadType === 'cloudinary') {
            // Handle Cloudinary upload
            return {
              method: 'POST' as const,
              url: `https://api.cloudinary.com/v1_1/${response.cloudName}/image/upload`,
              fields: {
                timestamp: response.timestamp.toString(),
                signature: response.signature,
                api_key: response.apiKey,
                public_id: response.publicId,
                folder: 'tripfolio',
              },
              headers: {},
            };
          } else {
            // Handle Replit object storage upload
            return {
              method: 'PUT' as const,
              url: response.uploadURL,
              headers: {},
            };
          }
        },
      })
      .on("complete", async (result) => {
        if (result.successful && result.successful.length > 0) {
          // Process all uploaded files
          for (const upload of result.successful) {
            let finalUrl = '';

            // Handle Cloudinary POST upload response
            if (upload.response?.body) {
              // Parse response body if it's a string
              let responseBody = upload.response.body;
              if (typeof responseBody === 'string') {
                try {
                  responseBody = JSON.parse(responseBody);
                } catch (e) {
                  console.error('Failed to parse Cloudinary response:', e);
                  continue;
                }
              }
              
              // Extract Cloudinary URL from parsed response
              if (responseBody.secure_url || responseBody.url) {
                finalUrl = responseBody.secure_url || responseBody.url;
              }
            }
            
            // Handle Replit PUT upload response
            if (!finalUrl && upload.response?.uploadURL) {
              finalUrl = upload.response.uploadURL;
            }

            if (finalUrl) {
              onComplete?.(finalUrl);
            }
          }
        }
        setShowModal(false);
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        variant={buttonVariant}
        type="button"
        data-testid="button-upload-file"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
