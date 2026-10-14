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
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  
  // For testing purposes, we'll use a hardcoded admin password
  const adminPassword = "admin123";
  
  // Remove authentication - page opens directly
  const isAuthenticated = true;
  
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

  // Query webhooks without authentication requirement for testing
  const webhooks = useQuery(api.webhookSettings.getWebhookSettings, {
    adminPassword,
  });

  // Check database connection
  useEffect(() => {
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
  }, [convex, adminPassword]);

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

  // Test webhook with custom payload
  const handleTestWithPayload = async (webhookUrl: string, payload: any, headers: any = {}) => {
    setIsTesting(true);
    const startTime = Date.now();
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EraserIO-Webhook-Test/1.0',
          ...headers,
        },
        body: JSON.stringify(payload),
      });
      
      const duration = Date.now() - startTime;
      const responseData = await response.text();
      
      const testResult = {
        id: Date.now(),
        url: webhookUrl,
        status: response.status,
        statusText: response.statusText,
        duration,
        success: response.ok,
        response: responseData,
        timestamp: new Date().toLocaleString(),
        payload: JSON.stringify(payload, null, 2),
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 4)]); // Keep last 5 results
      
      if (response.ok) {
        alert(`✅ Webhook test successful!\nStatus: ${response.status} ${response.statusText}\nDuration: ${duration}ms`);
      } else {
        alert(`❌ Webhook test failed!\nStatus: ${response.status} ${response.statusText}\nResponse: ${responseData}`);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const testResult = {
        id: Date.now(),
        url: webhookUrl,
        status: 0,
        statusText: 'Network Error',
        duration,
        success: false,
        response: err.message,
        timestamp: new Date().toLocaleString(),
        payload: JSON.stringify(payload, null, 2),
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 4)]);
      alert(`❌ Webhook test failed!\nError: ${err.message}`);
      setError(`Webhook test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Generate sample payloads
  const generateSamplePayload = (type: 'file_share' | 'team_invitation') => {
    if (type === 'file_share') {
      return {
        event: 'file_share',
        timestamp: new Date().toISOString(),
        data: {
          fileId: 'file_123456',
          fileName: 'test-document.pdf',
          fileSize: 2048576,
          shareId: 'share_789012',
          sharedBy: {
            id: 'user_001',
            name: 'John Doe',
            email: 'john@example.com'
          },
          sharedWith: {
            id: 'user_002',
            name: 'Jane Smith',
            email: 'jane@example.com'
          },
          permissions: ['read', 'download'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } else {
      return {
        event: 'team_invitation',
        timestamp: new Date().toISOString(),
        data: {
          invitationId: 'inv_345678',
          teamId: 'team_901234',
          teamName: 'Design Team',
          invitedBy: {
            id: 'user_003',
            name: 'Admin User',
            email: 'admin@example.com'
          },
          invitedUser: {
            email: 'newmember@example.com',
            role: 'member'
          },
          inviteUrl: 'https://app.example.com/join/inv_345678',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
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

      {/* Show error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content - No authentication required */}
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
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "file_share" | "team_invitation" })}
                      className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      <option value="file_share">File Share</option>
                      <option value="team_invitation">Team Invitation</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://your-server.com/webhook"
                      className="bg-background border-input text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key (optional)</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      value={formData.secretKey}
                      onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                      placeholder="Optional secret for HMAC validation"
                      className="bg-background border-input text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (ms)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="1000"
                        max="30000"
                        value={formData.timeoutMs}
                        onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value) })}
                        className="bg-background border-input"
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
                        onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value) })}
                        className="bg-background border-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headers">Custom Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      value={formData.headers}
                      onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                      placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                      rows={3}
                      className="bg-background border-input"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-primary bg-background border-input rounded focus:ring-primary focus:ring-2"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 border-0">
                      {isLoading ? "Creating..." : "Create Webhook"}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!formData.url) {
                          alert('Please enter a webhook URL first');
                          return;
                        }
                        handleTestWithPayload(formData.url, generateSamplePayload(formData.type));
                      }}
                      disabled={isTesting || !formData.url}
                      className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-0"
                      variant="outline"
                    >
                      {isTesting ? "Testing..." : "Test"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Real-time webhook system status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Connection</span>
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
                            className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-0"
                          >
                            <TestTube className="w-3 h-3 mr-1" />
                            {isTestingWebhook === webhook._id ? "Testing..." : "Test"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteWebhook(webhook._id)}
                            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
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

      {/* Webhook Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Webhook Testing</CardTitle>
          <CardDescription>
            Test your webhooks with sample data to verify they're working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Quick Test Buttons */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">File Share Event Test</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter webhook URL to test"
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="bg-background border-input"
                  />
                  <Button
                    onClick={() => {
                      if (!testPayload) {
                        alert('Please enter a webhook URL');
                        return;
                      }
                      handleTestWithPayload(testPayload, generateSamplePayload('file_share'));
                    }}
                    disabled={isTesting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                    variant="outline"
                  >
                    {isTesting ? "Testing..." : "🗂️ Test File Share Webhook"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Team Invitation Event Test</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter webhook URL to test"
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="bg-background border-input"
                  />
                  <Button
                    onClick={() => {
                      if (!testPayload) {
                        alert('Please enter a webhook URL');
                        return;
                      }
                      handleTestWithPayload(testPayload, generateSamplePayload('team_invitation'));
                    }}
                    disabled={isTesting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                    variant="outline"
                  >
                    {isTesting ? "Testing..." : "👥 Test Team Invite Webhook"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Custom Payload Testing */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">Custom Payload Test</h4>
              <div className="space-y-3">
                <Textarea
                  placeholder={`Enter custom JSON payload:
{
  "event": "custom_test",
  "timestamp": "${new Date().toISOString()}",
  "data": {
    "message": "This is a test webhook"
  }
}`}
                  rows={6}
                  className="font-mono text-sm bg-background border-input"
                  id="customPayload"
                />
                <Button
                  onClick={() => {
                    if (!testPayload) {
                      alert('Please enter a webhook URL above');
                      return;
                    }
                    const customPayloadElement = document.getElementById('customPayload') as HTMLTextAreaElement;
                    try {
                      const payload = JSON.parse(customPayloadElement.value || '{}');
                      handleTestWithPayload(testPayload, payload);
                    } catch (err) {
                      alert('Invalid JSON payload. Please check your syntax.');
                    }
                  }}
                  disabled={isTesting}
                  className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-800"
                  variant="secondary"
                >
                  {isTesting ? "Testing..." : "🚀 Send Custom Payload"}
                </Button>
              </div>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Recent Test Results</h4>
                  <Button
                    onClick={() => setTestResults([])}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/50"
                  >
                    Clear Results
                  </Button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-500" : ""}>
                            {result.success ? "✅ Success" : "❌ Failed"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                        </div>
                        <Badge variant="outline">
                          {result.status} • {result.duration}ms
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center space-x-1 mb-2">
                          <ExternalLink className="w-3 h-3" />
                          <span className="font-mono text-xs break-all">{result.url}</span>
                        </div>
                        
                        {/* Response */}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            📤 Response ({result.response.length} chars)
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {result.response}
                          </pre>
                        </details>
                        
                        {/* Payload */}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            📦 Sent Payload
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {result.payload}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Instructions */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">💡 Testing Tips</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Use tools like <strong>webhook.site</strong>, <strong>ngrok</strong>, or <strong>requestbin.com</strong> to create test endpoints</p>
                <p>• Check the response status and headers to ensure your endpoint is working correctly</p>
                <p>• Verify that your webhook endpoint can handle the JSON payload structure</p>
                <p>• Test both success and failure scenarios to ensure proper error handling</p>
                <p>• Monitor the duration to ensure your endpoint responds quickly enough</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
