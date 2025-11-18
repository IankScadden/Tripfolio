import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, X, Image as ImageIcon, Tag, FileText, MapPin, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/Header";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const postTripSchema = z.object({
  tripType: z.enum(["plan", "traveled"]),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  headerImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

type PostTripFormData = z.infer<typeof postTripSchema>;

type Trip = {
  id: string;
  name: string;
  tripType?: string;
  description?: string;
  headerImageUrl?: string;
  tags?: string[];
  photos?: string[];
  isPublic?: boolean;
};

export default function PostTrip() {
  const [, params] = useRoute("/trip/:id/post");
  const [, setLocation] = useLocation();
  const tripId = params?.id;
  const { toast } = useToast();

  const [newTag, setNewTag] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId,
  });

  const form = useForm<PostTripFormData>({
    resolver: zodResolver(postTripSchema),
    defaultValues: {
      tripType: "plan",
      description: "",
      headerImageUrl: "",
      tags: [],
      photos: [],
    },
  });

  // Update form when trip data loads
  useEffect(() => {
    if (trip) {
      form.reset({
        tripType: (trip.tripType as "plan" | "traveled") || "plan",
        description: trip.description || "",
        headerImageUrl: trip.headerImageUrl || "",
        tags: trip.tags || [],
        photos: trip.photos || [],
      });
    }
  }, [trip, form]);

  const postTripMutation = useMutation({
    mutationFn: async (data: PostTripFormData) => {
      // Post the trip by setting is_public = 1 and updating all the fields
      const response = await apiRequest("PATCH", `/api/trips/${tripId}`, {
        ...data,
        isPublic: 1,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/explore/trips"] });
      toast({
        title: "Trip Posted!",
        description: "Your trip is now live in the Explore community.",
      });
      setLocation(`/trip/${tripId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post trip. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues("tags") || [];
      const tagToAdd = newTag.trim().startsWith("#") ? newTag.trim() : `#${newTag.trim()}`;
      if (!currentTags.includes(tagToAdd)) {
        form.setValue("tags", [...currentTags, tagToAdd]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddPhoto = () => {
    if (newPhoto.trim()) {
      const currentPhotos = form.getValues("photos") || [];
      if (!currentPhotos.includes(newPhoto.trim())) {
        form.setValue("photos", [...currentPhotos, newPhoto.trim()]);
      }
      setNewPhoto("");
    }
  };

  const handleRemovePhoto = (photoToRemove: string) => {
    const currentPhotos = form.getValues("photos") || [];
    form.setValue("photos", currentPhotos.filter(photo => photo !== photoToRemove));
  };

  const onSubmit = (data: PostTripFormData) => {
    postTripMutation.mutate(data);
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const { uploadURL } = await response.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Trip not found</h2>
          <Button onClick={() => setLocation("/my-trips")}>Back to My Trips</Button>
        </div>
      </div>
    );
  }

  const headerImageUrl = form.watch("headerImageUrl");
  const tags = form.watch("tags") || [];
  const photos = form.watch("photos") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation(`/trip/${tripId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Post to Community</h1>
          <p className="text-muted-foreground">
            Share your <span className="font-semibold">{trip.name}</span> trip with the Tripfolio community
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Trip Type */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <CardTitle>Trip Status</CardTitle>
                </div>
                <CardDescription>
                  Is this a plan for a future trip or a trip you've already completed?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            type="button"
                            variant={field.value === "plan" ? "default" : "outline"}
                            className="h-auto py-6 flex flex-col gap-2"
                            onClick={() => field.onChange("plan")}
                            data-testid="button-trip-type-plan"
                          >
                            <MapPin className="h-6 w-6" />
                            <div>
                              <div className="font-semibold text-base">Planning</div>
                              <div className="text-xs opacity-80 font-normal">Future trip idea</div>
                            </div>
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "traveled" ? "default" : "outline"}
                            className="h-auto py-6 flex flex-col gap-2"
                            onClick={() => field.onChange("traveled")}
                            data-testid="button-trip-type-traveled"
                          >
                            <CheckCircle2 className="h-6 w-6" />
                            <div>
                              <div className="font-semibold text-base">Traveled</div>
                              <div className="text-xs opacity-80 font-normal">Completed journey</div>
                            </div>
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Header Image */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <CardTitle>Cover Image</CardTitle>
                </div>
                <CardDescription>
                  Add a stunning hero image that represents your trip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="headerImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            data-testid="input-header-image"
                          />
                        </FormControl>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5 * 1024 * 1024}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadedUrl = result.successful[0].uploadURL;
                              if (uploadedUrl) {
                                const response = await apiRequest("PUT", `/api/trips/${tripId}/header-image`, {
                                  headerImageUrl: uploadedUrl,
                                });
                                const { objectPath } = await response.json();
                                field.onChange(objectPath);
                                toast({
                                  title: "Image uploaded",
                                  description: "Header image uploaded successfully",
                                });
                              }
                            }
                          }}
                          buttonVariant="secondary"
                        >
                          <Upload className="h-4 w-4" />
                        </ObjectUploader>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {headerImageUrl && (
                  <div className="relative aspect-[3/1] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={headerImageUrl}
                      alt="Header preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Trip Story</CardTitle>
                </div>
                <CardDescription>
                  Share your experiences, highlights, and tips for future travelers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Tell the story of your adventure... What were the highlights? What did you learn? What would you recommend to others?"
                          className="min-h-[200px] resize-none"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-2">
                        {field.value?.length || 0} / 5000 characters
                      </p>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Hashtags */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <CardTitle>Hashtags</CardTitle>
                </div>
                <CardDescription>
                  Help others discover your trip with relevant tags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="backpacking, solotravel, europe..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    data-testid="input-new-tag"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTag}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-2 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-muted rounded-full p-0.5"
                          data-testid={`button-remove-tag-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photo Gallery */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <CardTitle>Photo Gallery</CardTitle>
                </div>
                <CardDescription>
                  Add photos to showcase your journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/photo.jpg"
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPhoto();
                      }
                    }}
                    data-testid="input-new-photo"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddPhoto}
                    data-testid="button-add-photo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={5 * 1024 * 1024}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                      if (result.successful && result.successful.length > 0) {
                        const currentPhotos = form.getValues("photos") || [];
                        const newPhotoUrls: string[] = [];
                        
                        for (const file of result.successful) {
                          if (file.uploadURL) {
                            const response = await apiRequest("PUT", `/api/trips/${tripId}/photos`, {
                              photoUrl: file.uploadURL,
                            });
                            const { objectPath } = await response.json();
                            newPhotoUrls.push(objectPath);
                          }
                        }
                        
                        form.setValue("photos", [...currentPhotos, ...newPhotoUrls]);
                        toast({
                          title: `${newPhotoUrls.length} photo(s) uploaded`,
                          description: "Photos added to gallery successfully",
                        });
                      }
                    }}
                    buttonVariant="secondary"
                  >
                    <Upload className="h-4 w-4" />
                  </ObjectUploader>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={photo}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-photo-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Button */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Ready to share your adventure?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your trip will appear in the Explore community for others to discover
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={postTripMutation.isPending}
                    data-testid="button-post"
                    className="ml-4"
                  >
                    {postTripMutation.isPending ? "Posting..." : "Post Trip"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
