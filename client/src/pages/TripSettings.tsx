import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tripSettingsSchema = z.object({
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  headerImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

type TripSettingsFormData = z.infer<typeof tripSettingsSchema>;

type Trip = {
  id: string;
  name: string;
  description?: string;
  headerImageUrl?: string;
  tags?: string[];
  photos?: string[];
};

export default function TripSettings() {
  const [, params] = useRoute("/trip/:id/settings");
  const [, setLocation] = useLocation();
  const tripId = params?.id;
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId,
  });

  const form = useForm<TripSettingsFormData>({
    resolver: zodResolver(tripSettingsSchema),
    values: {
      description: trip?.description || "",
      headerImageUrl: trip?.headerImageUrl || "",
      tags: trip?.tags || [],
      photos: trip?.photos || [],
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async (data: TripSettingsFormData) => {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trip settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !form.getValues("tags")?.includes(newTag.trim())) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddPhoto = () => {
    if (newPhoto.trim()) {
      try {
        new URL(newPhoto.trim());
        const currentPhotos = form.getValues("photos") || [];
        form.setValue("photos", [...currentPhotos, newPhoto.trim()]);
        setNewPhoto("");
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid image URL",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemovePhoto = (photoToRemove: string) => {
    const currentPhotos = form.getValues("photos") || [];
    form.setValue("photos", currentPhotos.filter(photo => photo !== photoToRemove));
  };

  const onSubmit = (data: TripSettingsFormData) => {
    updateTripMutation.mutate(data);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Trip not found</h2>
          <Button onClick={() => setLocation("/my-trips")} data-testid="button-back">
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocation(`/trip/${tripId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trip
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6">Trip Settings: {trip.name}</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Image */}
            <Card>
              <CardHeader>
                <CardTitle>Header Image</CardTitle>
                <CardDescription>
                  Add a beautiful cover image for your trip (URL)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="headerImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          {...field} 
                          data-testid="input-header-image"
                        />
                      </FormControl>
                      <FormDescription>
                        Paste a link to an image from the web
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("headerImageUrl") && (
                  <div className="mt-4">
                    <img 
                      src={form.watch("headerImageUrl")} 
                      alt="Header preview" 
                      className="w-full h-48 object-cover rounded-lg"
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
                <CardTitle>Description</CardTitle>
                <CardDescription>
                  Share your story and travel tips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell others about your amazing trip experience..." 
                          className="min-h-[200px] resize-y"
                          {...field} 
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0} / 5000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Add hashtags to help others discover your trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. #backpacking, #budget, #solo"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      data-testid="input-new-tag"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddTag}
                      data-testid="button-add-tag"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("tags")?.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="gap-1 px-3 py-1"
                        data-testid={`tag-${index}`}
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-tag-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Gallery */}
            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery</CardTitle>
                <CardDescription>
                  Add more photos from your trip (URLs)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/photo.jpg"
                      value={newPhoto}
                      onChange={(e) => setNewPhoto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPhoto();
                        }
                      }}
                      data-testid="input-new-photo"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddPhoto}
                      data-testid="button-add-photo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {form.watch("photos")?.map((photo, index) => (
                      <div 
                        key={index} 
                        className="relative group"
                        data-testid={`photo-${index}`}
                      >
                        <img 
                          src={photo} 
                          alt={`Gallery ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Invalid+Image';
                          }}
                        />
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
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/trip/${tripId}`)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTripMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateTripMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
