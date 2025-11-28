import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Shield, Ticket, Copy, Check, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { PromoCode } from "@shared/schema";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newCode, setNewCode] = useState({
    code: "",
    description: "",
    benefitType: "premium_days",
    benefitValue: 30,
    maxRedemptions: "",
    expiresAt: "",
  });

  const { data: promoCodes, isLoading: codesLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promo-codes"],
    enabled: !!user?.isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCode) => {
      const response = await apiRequest("POST", "/api/admin/promo-codes", {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        benefitType: data.benefitType,
        benefitValue: data.benefitValue,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        expiresAt: data.expiresAt || null,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create promo code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Promo code created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setNewCode({
        code: "",
        description: "",
        benefitType: "premium_days",
        benefitValue: 30,
        maxRedemptions: "",
        expiresAt: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/promo-codes/${id}`, { isActive });
      if (!response.ok) throw new Error("Failed to update promo code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">This page is only accessible to administrators.</p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage promo codes and user access</p>
        </div>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Promo Code
            </CardTitle>
            <CardDescription>
              Create codes for free premium access or bonus AI uses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newCode);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Promo Code</Label>
                  <Input
                    id="code"
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., FRIEND30"
                    required
                    data-testid="input-new-promo-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefitType">Benefit Type</Label>
                  <Select
                    value={newCode.benefitType}
                    onValueChange={(value) => setNewCode({ ...newCode, benefitType: value })}
                  >
                    <SelectTrigger data-testid="select-benefit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium_days">Premium Days</SelectItem>
                      <SelectItem value="ai_uses">Extra AI Uses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefitValue">
                    {newCode.benefitType === "premium_days" ? "Days of Premium" : "Number of AI Uses"}
                  </Label>
                  <Input
                    id="benefitValue"
                    type="number"
                    min="1"
                    value={newCode.benefitValue}
                    onChange={(e) => setNewCode({ ...newCode, benefitValue: parseInt(e.target.value) || 1 })}
                    required
                    data-testid="input-benefit-value"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRedemptions">Max Redemptions (optional)</Label>
                  <Input
                    id="maxRedemptions"
                    type="number"
                    min="1"
                    value={newCode.maxRedemptions}
                    onChange={(e) => setNewCode({ ...newCode, maxRedemptions: e.target.value })}
                    placeholder="Unlimited"
                    data-testid="input-max-redemptions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires On (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={newCode.expiresAt}
                    onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                    data-testid="input-expires-at"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newCode.description}
                    onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                    placeholder="e.g., Friends & family discount"
                    className="resize-none"
                    data-testid="input-description"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending || !newCode.code.trim()}
                data-testid="button-create-promo"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Promo Code
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Existing Promo Codes
            </CardTitle>
            <CardDescription>
              {promoCodes?.length || 0} promo code{promoCodes?.length !== 1 ? "s" : ""} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {codesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !promoCodes?.length ? (
              <p className="text-center text-muted-foreground py-8">
                No promo codes yet. Create your first one above!
              </p>
            ) : (
              <div className="space-y-4">
                {promoCodes.map((code) => {
                  const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                  const isMaxedOut = code.maxRedemptions !== null && code.currentRedemptions >= code.maxRedemptions;
                  
                  return (
                    <div
                      key={code.id}
                      className={`border rounded-lg p-4 ${
                        !code.isActive || isExpired || isMaxedOut ? "opacity-60" : ""
                      }`}
                      data-testid={`promo-card-${code.code}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-lg font-mono font-bold bg-muted px-2 py-1 rounded">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(code.code)}
                              data-testid={`button-copy-${code.code}`}
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            {!code.isActive && <Badge variant="secondary">Inactive</Badge>}
                            {isExpired && <Badge variant="destructive">Expired</Badge>}
                            {isMaxedOut && <Badge variant="secondary">Maxed Out</Badge>}
                          </div>
                          
                          {code.description && (
                            <p className="text-sm text-muted-foreground">{code.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline">
                              {code.benefitType === "premium_days"
                                ? `${code.benefitValue} days premium`
                                : `${code.benefitValue} AI uses`}
                            </Badge>
                            <Badge variant="outline">
                              {code.currentRedemptions}
                              {code.maxRedemptions ? ` / ${code.maxRedemptions}` : ""} used
                            </Badge>
                            {code.expiresAt && (
                              <Badge variant="outline">
                                Expires {new Date(code.expiresAt).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${code.id}`} className="text-sm">
                            Active
                          </Label>
                          <Switch
                            id={`toggle-${code.id}`}
                            checked={code.isActive === 1}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: code.id, isActive: checked })
                            }
                            disabled={toggleMutation.isPending}
                            data-testid={`toggle-${code.code}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
