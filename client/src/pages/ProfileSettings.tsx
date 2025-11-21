import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/ImageCropper";

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
  bio: z.string().max(300, "Bio must be less than 300 characters").optional(),
  profileImageUrl: z.string().refine(
    (val) => !val || val === "" || val.startsWith("/objects/") || val.startsWith("http://") || val.startsWith("https://"),
    { message: "Must be a valid URL or object path" }
  ).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type User = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  bio?: string;
};

export default function ProfileSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profileImageUrl: "",
    },
  });

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      const defaultName = user.displayName || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : "") ||
        user.email || "";
      form.reset({
        displayName: defaultName,
        bio: user.bio || "",
        profileImageUrl: user.profileImageUrl || "",
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Your profile has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setIsUploading(true);

    try {
      // Get upload credentials
      const uploadResponse = await apiRequest("POST", "/api/objects/upload", {});
      const uploadData = await uploadResponse.json();

      let uploadedUrl = '';

      if (uploadData.uploadType === 'cloudinary') {
        // Cloudinary upload
        const formData = new FormData();
        formData.append('file', croppedBlob);
        formData.append('timestamp', uploadData.timestamp.toString());
        formData.append('signature', uploadData.signature);
        formData.append('api_key', uploadData.apiKey);
        formData.append('public_id', uploadData.publicId);
        formData.append('folder', 'tripfolio');

        const uploadResult = await fetch(
          `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResult.ok) {
          throw new Error("Upload failed");
        }

        const cloudinaryResponse = await uploadResult.json();
        uploadedUrl = cloudinaryResponse.secure_url || cloudinaryResponse.url;
      } else {
        // Replit object storage upload
        const uploadResult = await fetch(uploadData.uploadURL, {
          method: "PUT",
          body: croppedBlob,
          headers: {
            "Content-Type": "image/jpeg",
          },
        });

        if (!uploadResult.ok) {
          throw new Error("Upload failed");
        }

        uploadedUrl = uploadData.uploadURL;
      }

      // Set ACL and save to profile
      const response = await apiRequest("PUT", "/api/users/profile-picture", {
        profilePictureUrl: uploadedUrl,
      });
      const { objectPath } = await response.json();

      // Update form state immediately
      form.setValue("profileImageUrl", objectPath);

      // Optimistically update all relevant query caches
      if (user) {
        // Update profile cache
        queryClient.setQueryData(["/api/profile"], { ...user, profileImageUrl: objectPath });

        // Update auth user cache
        queryClient.setQueryData(["/api/auth/user"], (old: any) =>
          old ? { ...old, profileImageUrl: objectPath } : old
        );

        // Update public profile cache
        queryClient.setQueryData(["/api/users", user.id], (old: any) =>
          old ? { ...old, user: { ...old.user, profileImageUrl: objectPath } } : old
        );
      }

      // Invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (user) {
        await queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      }

      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ["/api/profile"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation("/my-trips")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Customize how your name appears to other users when you share trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your display name"
                          {...field}
                          data-testid="input-display-name"
                        />
                      </FormControl>
                      <FormDescription>
                        This is how your name will appear on trips you share with the community
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell others about yourself and your travel experiences..."
                          {...field}
                          data-testid="input-bio"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Share a bit about yourself (max 300 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/your-photo.jpg"
                            {...field}
                            data-testid="input-profile-image-url"
                          />
                        </FormControl>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="profile-picture-input"
                          data-testid="input-file-profile-picture"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("profile-picture-input")?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-profile-picture"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                      <FormDescription>
                        Enter a URL or upload an image from your computer (max 5MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/my-trips")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>

            {user && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Account Information</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {user.email && (
                    <div>
                      <span className="font-medium text-foreground">Email:</span> {user.email}
                    </div>
                  )}
                  {user.firstName && user.lastName && (
                    <div>
                      <span className="font-medium text-foreground">Name:</span> {user.firstName} {user.lastName}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          open={showCropper}
        />
      )}
    </div>
  );
}
