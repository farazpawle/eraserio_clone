"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, ExternalLink, Trash2, TestTube } from "lucide-react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Convex hooks
  const convex = useConvex();
  const createWebhook = useMutation(api.webhookSettings.createWebhookSetting);
  const deleteWebhook = useMutation(api.webhookSettings.deleteWebhookSetting);
  const testWebhook = useMutation(api.webhookSettings.testWebhookEndpoint);
  
  // Form state
  const [formData, setFormData] = useState({
    type: "file_share" as "file_share" | "team_invitation",
    url: "",
    secretKey: "",
    headers: "",
    timeoutMs: 30000,
    retryAttempts: 3,
    isActive: true,
  });

  // Query webhooks only if authenticated
  const webhooks = useQuery(
    api.webhookSettings.getWebhookSettings, 
    isAuthenticated ? { adminPassword } : "skip"
  );

  // Check database connection only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkConnection = async () => {
      try {
        await convex.query(api.webhookSettings.getWebhookSettings, {
          adminPassword,
        });
        setDbStatus("connected");
      } catch (error) {
        console.error("Database connection failed:", error);
        setDbStatus("error");
        setError(error instanceof Error ? error.message : "Database connection failed");
      }
    };

    checkConnection();
  }, [convex, adminPassword, isAuthenticated]);

  // Handle admin login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setError("Please enter admin password");
      return;
    }
    
    try {
      // Test the password by trying to query webhooks
      await convex.query(api.webhookSettings.getWebhookSettings, {
        adminPassword,
      });
      setIsAuthenticated(true);
      setError(null);
    } catch (error) {
      setError("Invalid admin password");
      setIsAuthenticated(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await createWebhook({
        type: formData.type,
        url: formData.url,
        secretKey: formData.secretKey || undefined,
        headers: formData.headers || undefined,
        timeoutMs: formData.timeoutMs,
        retryAttempts: formData.retryAttempts,
        isActive: formData.isActive,
        adminPassword,
      });
      
      // Reset form
      setFormData({
        type: "file_share",
        url: "",
        secretKey: "",
        headers: "",
        timeoutMs: 30000,
        retryAttempts: 3,
        isActive: true,
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;
    
    try {
      await deleteWebhook({
        webhookId: webhookId as any,
        adminPassword,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setIsTestingWebhook(webhookId);
    setError(null);
    
    try {
      const result = await testWebhook({
        webhookId: webhookId as any,
        adminPassword,
      });
      
      if (result.success) {
        alert(`Webhook test successful! Status: ${result.status} (${result.duration}ms)`);
      } else {
        alert(`Webhook test failed: ${result.error}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTestingWebhook(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Webhook Settings</h2>
        <p className="text-muted-foreground">
          Configure webhook endpoints for invitation notifications
        </p>
      </div>

      {/* Admin Login Form */}
      {!isAuthenticated && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter the admin password to access webhook settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Show error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content - Only show if authenticated */}
      {isAuthenticated && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Webhook Form */}
          <Card>
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>
              Add a new webhook endpoint to receive invitation notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <select
                  id="eventType"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as "file_share" | "team_invitation" }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="file_share">File Share Invitations</option>
                  <option value="team_invitation">Team Invitations</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-api.com/webhook"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key (Optional)</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="For HMAC signature verification"
                  value={formData.secretKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">Custom Headers (Optional JSON)</Label>
                <Textarea
                  id="headers"
                  placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                  value={formData.headers}
                  onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1000"
                    max="300000"
                    value={formData.timeoutMs}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeoutMs: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retries">Retry Attempts</Label>
                  <Input
                    id="retries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.retryAttempts}
                    onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <Button type="submit" disabled={isLoading || dbStatus !== "connected"} className="w-full">
                {isLoading ? "Creating..." : "Create Webhook"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current webhook system status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Admin Page</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />Working
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Database Connection</span>
                {dbStatus === "checking" && (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />Checking...
                  </Badge>
                )}
                {dbStatus === "connected" && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />Connected
                  </Badge>
                )}
                {dbStatus === "error" && (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />Error
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Webhook Delivery</span>
                <Badge variant={dbStatus === "connected" ? "default" : "secondary"} className={dbStatus === "connected" ? "bg-green-500" : ""}>
                  {dbStatus === "connected" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {dbStatus === "connected" ? "Ready" : "Waiting"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Webhooks */}
      {webhooks && webhooks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configured Webhooks</CardTitle>
              <CardDescription>
                Manage your existing webhook endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={webhook.type === "file_share" ? "default" : "secondary"}>
                          {webhook.type === "file_share" ? "File Share" : "Team Invitation"}
                        </Badge>
                        <Badge variant={webhook.isActive ? "default" : "secondary"} className={webhook.isActive ? "bg-green-500" : ""}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWebhook(webhook._id)}
                          disabled={isTestingWebhook === webhook._id}
                        >
                          <TestTube className="w-3 h-3 mr-1" />
                          {isTestingWebhook === webhook._id ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteWebhook(webhook._id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <ExternalLink className="w-3 h-3" />
                        <span className="font-mono">{webhook.url}</span>
                      </div>
                      <div className="mt-1">
                        Timeout: {webhook.timeoutMs}ms • Retries: {webhook.retryAttempts} • 
                        Created: {new Date(webhook.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </div>
  );
}