import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import AwsS3 from "@uppy/aws-s3";
import XHRUpload from "@uppy/xhr-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [uploadType, setUploadType] = useState<'cloudinary' | 'replit' | null>(null);
  const [uploadParams, setUploadParams] = useState<any>(null);
  
  // Use ref for onComplete to avoid effect re-runs
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    })
  );

  // Dedicated effect to apply Cloudinary metadata whenever uploadParams changes
  // This ensures ALL queued files get the latest signed fields
  useEffect(() => {
    if (uploadType === 'cloudinary' && uploadParams) {
      const metadata = {
        timestamp: uploadParams.timestamp.toString(),
        signature: uploadParams.signature,
        api_key: uploadParams.apiKey,
        public_id: uploadParams.publicId,
        folder: uploadParams.folder,
      };
      
      // Set global default for future files
      uppy.setMeta(metadata);
      
      // Backfill all existing queued files
      uppy.getFiles().forEach(file => {
        uppy.setFileMeta(file.id, metadata);
      });
    }
  }, [uploadType, uploadParams, uppy]);

  useEffect(() => {
    if (!uploadType || !uploadParams) return;

    const handleUploadSuccess = async (file: any, response: any) => {
      let finalUrl = '';
      
      if (uploadType === 'cloudinary') {
        finalUrl = (response.body as any)?.url || '';
      } else {
        // For Replit/S3, the uploadURL is in the response
        finalUrl = response.uploadURL || file.uploadURL || '';
      }
      if (finalUrl && onCompleteRef.current) {
        try {
          await onCompleteRef.current(finalUrl);
        } catch (error) {
          console.error('[UniversalUploader] onComplete callback error:', error);
          // Don't rethrow - we already have error handling in place
        }
      }
    };

    const handleUploadError = (file: any, error: any) => {
      console.error('[UniversalUploader] Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    };

    // Note: file-added listener not needed - the dedicated uploadParams effect
    // handles both global meta AND per-file backfilling whenever params change

    const handleComplete = (result: any) => {
      // Only close modal if there were no failures
      if (result.failed && result.failed.length > 0) {
        return;
      }
      
      setShowModal(false);
    };

    // Remove any existing upload plugins to avoid conflicts
    const existingXHR = uppy.getPlugin('XHRUpload');
    const existingS3 = uppy.getPlugin('AwsS3');
    if (existingXHR) uppy.removePlugin(existingXHR);
    if (existingS3) uppy.removePlugin(existingS3);

    if (uploadType === 'cloudinary') {
      uppy.use(XHRUpload, {
        id: 'XHRUpload',
        endpoint: `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/image/upload`,
        method: 'POST',
        formData: true,
        fieldName: 'file',
        allowedMetaFields: ['timestamp', 'signature', 'api_key', 'public_id', 'folder'],
        getResponseData: (xhr: XMLHttpRequest) => {
          const response = JSON.parse(xhr.responseText);
          
          // Check for Cloudinary errors
          if (response.error) {
            throw new Error(response.error.message || 'Upload failed');
          }
          
          return {
            url: response.secure_url || response.url,
          };
        },
      } as any);  // Type assertion to allow allowedMetaFields
    } else {
      uppy.use(AwsS3, {
        id: 'AwsS3',
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          return {
            method: 'PUT' as const,
            url: uploadParams.uploadURL,
            headers: {},
          };
        },
      });
    }

    uppy.on("upload-success", handleUploadSuccess);
    uppy.on("upload-error", handleUploadError);
    uppy.on("complete", handleComplete);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
      uppy.off("upload-error", handleUploadError);
      uppy.off("complete", handleComplete);
      // Don't cancel uploads on cleanup - only on component unmount
    };
  }, [uploadType, uploadParams, uppy, toast]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      uppy.cancelAll();
    };
  }, [uppy]);

  const handleOpenModal = async () => {
    try {
      const res = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
      });
      const response = await res.json();
      
      // Set state - this triggers the dedicated uploadParams effect
      // which will apply metadata to ALL files
      setUploadType(response.uploadType);
      setUploadParams(response);
      setShowModal(true);
    } catch (error) {
      console.error('[UniversalUploader] Failed to get upload params:', error);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleOpenModal} 
        className={buttonClassName}
        variant={buttonVariant}
        type="button"
        data-testid="button-upload-file"
      >
        {children}
      </Button>

      {uploadType && (
        <DashboardModal
          uppy={uppy}
          open={showModal}
          onRequestClose={() => setShowModal(false)}
          proudlyDisplayPoweredByUppy={false}
        />
      )}
    </div>
  );
}
