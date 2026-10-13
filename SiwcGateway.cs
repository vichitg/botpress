using System.IO;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;

namespace BotPress;

// A separate OAuth proof-of-concept. Does not change Rakazo's provider.
internal static class SiwcGateway
{
    private static readonly HttpClient Client = new() { Timeout = TimeSpan.FromSeconds(7) };
    private const string Url = "http://127.0.0.1:17455";
    public static async Task<object?> Status()
    {
        try { return JsonDocument.Parse(await Client.GetStringAsync(Url + "/status")).RootElement.Clone(); }
        catch { return new { connected = false, available = false, message = "SIWC gateway is not running" }; }
    }
    public static async Task<object?> Login()
    {
        try { await Client.GetAsync(Url + "/status"); }
        catch
        {
            var script = Path.Combine(AppContext.BaseDirectory, "siwc", "gateway.mjs");
            if (!File.Exists(script)) throw new FileNotFoundException("SIWC gateway.mjs not found", script);
            Process.Start(new ProcessStartInfo("node.exe", "\"" + script + "\"") { UseShellExecute = false, CreateNoWindow = true });
            bool ready = false;
            for (int n = 0; n < 25; n++)
            {
                await Task.Delay(200);
                try { using var check = await Client.GetAsync(Url + "/status"); ready = check.IsSuccessStatusCode; if (ready) break; }
                catch { }
            }
            if (!ready) throw new InvalidOperationException("SIWC gateway did not start");
        }
        using var response = await Client.PostAsJsonAsync(Url + "/login", new { });
        response.EnsureSuccessStatusCode();
        return new { started = true, message = "Complete sign-in in your system browser" };
    }
}