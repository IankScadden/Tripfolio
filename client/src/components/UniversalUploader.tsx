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

  useEffect(() => {
    if (!uploadType || !uploadParams) return;

    const handleUploadSuccess = (file: any, response: any) => {
      console.log('[UniversalUploader] Upload success:', file, response);
      let finalUrl = '';
      
      if (uploadType === 'cloudinary') {
        finalUrl = (response.body as any)?.url || '';
      } else {
        // For Replit/S3, the uploadURL is in the response
        finalUrl = response.uploadURL || file.uploadURL || '';
      }
      
      console.log('[UniversalUploader] Final URL:', finalUrl);
      if (finalUrl && onCompleteRef.current) {
        onCompleteRef.current(finalUrl);
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

    const handleFileAdded = (file: any) => {
      // Apply metadata to newly added files
      if (uploadType === 'cloudinary' && uploadParams) {
        console.log('[UniversalUploader] Applying metadata to newly added file:', file.id);
        uppy.setFileMeta(file.id, {
          timestamp: uploadParams.timestamp.toString(),
          signature: uploadParams.signature,
          api_key: uploadParams.apiKey,
          public_id: uploadParams.publicId,
          folder: uploadParams.folder,
        });
      }
    };

    const handleComplete = (result: any) => {
      console.log('[UniversalUploader] All uploads complete:', result);
      
      // Only close modal if there were no failures
      if (result.failed && result.failed.length > 0) {
        console.error('[UniversalUploader] Some uploads failed:', result.failed);
        // Keep modal open so user can retry
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
        metaFields: ['timestamp', 'signature', 'api_key', 'public_id', 'folder'],
        getResponseData: (xhr: XMLHttpRequest) => {
          console.log('[UniversalUploader] Cloudinary response:', xhr.responseText);
          const response = JSON.parse(xhr.responseText);
          
          // Check for Cloudinary errors
          if (response.error) {
            console.error('[UniversalUploader] Cloudinary error:', response.error);
            throw new Error(response.error.message || 'Upload failed');
          }
          
          return {
            url: response.secure_url || response.url,
          };
        },
      } as any);  // Type assertion to allow metaFields
      
      // Apply metadata to any existing files in the queue
      console.log('[UniversalUploader] Applying metadata to existing files in queue');
      uppy.getFiles().forEach(file => {
        uppy.setFileMeta(file.id, {
          timestamp: uploadParams.timestamp.toString(),
          signature: uploadParams.signature,
          api_key: uploadParams.apiKey,
          public_id: uploadParams.publicId,
          folder: uploadParams.folder,
        });
      });
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
    uppy.on("file-added", handleFileAdded);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
      uppy.off("upload-error", handleUploadError);
      uppy.off("complete", handleComplete);
      uppy.off("file-added", handleFileAdded);
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
      console.log('[UniversalUploader] Got upload params:', response);
      
      setUploadType(response.uploadType);
      setUploadParams(response);
      
      // For Cloudinary, set global metadata BEFORE opening modal
      // This ensures metadata is present even if files are queued before useEffect runs
      if (response.uploadType === 'cloudinary') {
        console.log('[UniversalUploader] Setting global Cloudinary metadata before modal opens');
        const metadata = {
          timestamp: response.timestamp.toString(),
          signature: response.signature,
          api_key: response.apiKey,
          public_id: response.publicId,
          folder: response.folder,
        };
        
        uppy.setMeta(metadata);
        
        // Also apply to any existing files in queue
        uppy.getFiles().forEach(file => {
          uppy.setFileMeta(file.id, metadata);
        });
      }
      
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
