param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [int]$Port = 4181
)

$resolvedRoot = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg" { return "image/svg+xml" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".webp" { return "image/webp" }
    ".mp4" { return "video/mp4" }
    ".txt" { return "text/plain; charset=utf-8" }
    default { return "application/octet-stream" }
  }
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "terra-viva-inventory-viewer/index.html"
    }

    $targetPath = Join-Path $resolvedRoot $requestPath
    $fullTargetPath = [System.IO.Path]::GetFullPath($targetPath)

    if (-not $fullTargetPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (Test-Path $fullTargetPath -PathType Container) {
      $fullTargetPath = Join-Path $fullTargetPath "index.html"
    }

    if (-not (Test-Path $fullTargetPath -PathType Leaf)) {
      $fallback404 = Join-Path $resolvedRoot "terra-viva-inventory-viewer\\404.html"
      if (Test-Path $fallback404 -PathType Leaf) {
        $fullTargetPath = $fallback404
        $context.Response.StatusCode = 404
      } else {
        $context.Response.StatusCode = 404
        $context.Response.Close()
        continue
      }
    } else {
      $context.Response.StatusCode = 200
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullTargetPath)
    $context.Response.ContentType = Get-ContentType -Path $fullTargetPath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
