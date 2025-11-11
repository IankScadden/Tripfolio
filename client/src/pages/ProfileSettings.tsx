import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
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

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
  bio: z.string().max(300, "Bio must be less than 300 characters").optional(),
  profileImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
                      <FormLabel>Profile Picture URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/your-photo.jpg"
                          {...field}
                          data-testid="input-profile-image-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a URL to an image for your profile picture
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
    </div>
  );
}
