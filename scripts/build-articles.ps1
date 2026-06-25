# Build data/articles.json from articles/*.md frontmatter
# Usage: powershell -File scripts/build-articles.ps1

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ArticlesDir = Join-Path $Root "articles"
$OutFile = Join-Path $Root "data\articles.json"

function Parse-Frontmatter($Text) {
    $Text = $Text -replace '^\uFEFF', ''
    if ($Text -notmatch '(?s)^---\r?\n(.*?)\r?\n---\r?\n(.*)$') {
        return @{ Meta = @{}; Body = $Text.Trim() }
    }

    $Meta = @{}
    $CurrentKey = $null

    foreach ($Line in ($Matches[1] -split "`n")) {
        $Line = $Line.TrimEnd()
        if ([string]::IsNullOrWhiteSpace($Line)) { continue }

        if ($Line -match '^\s*-\s+(.+)$') {
            if ($CurrentKey) {
                if (-not $Meta[$CurrentKey]) { $Meta[$CurrentKey] = @() }
                $Meta[$CurrentKey] += $Matches[1].Trim().Trim('"').Trim("'")
            }
            continue
        }

        if ($Line -match '^([A-Za-z_][\w-]*):\s*(.*)$') {
            $CurrentKey = $Matches[1]
            $Val = $Matches[2].Trim()
            if ($Val -eq '') {
                $Meta[$CurrentKey] = @()
            } elseif ($Val -eq 'true') {
                $Meta[$CurrentKey] = $true
            } elseif ($Val -eq 'false') {
                $Meta[$CurrentKey] = $false
            } else {
                $Meta[$CurrentKey] = $Val.Trim('"').Trim("'")
            }
        }
    }

    return @{ Meta = $Meta; Body = $Matches[2] }
}

$Articles = @()
Get-ChildItem $ArticlesDir -Filter "*.md" | Where-Object { $_.Name -ne "_template.md" } | ForEach-Object {
    $Parsed = Parse-Frontmatter (Get-Content $_.FullName -Raw -Encoding UTF8)
    $M = $Parsed.Meta
    if (-not $M.id) {
        Write-Warning "Skip $($_.Name): missing id"
        return
    }

    $Tags = @()
    if ($M.tags -is [array]) { $Tags = $M.tags }
    elseif ($M.tags) { $Tags = @($M.tags) }

    $Cover = ""
    if ($M.cover) { $Cover = [string]$M.cover }

    $Articles += [ordered]@{
        id       = [string]$M.id
        category = if ($M.category) { [string]$M.category } else { "news" }
        featured = [bool]$M.featured
        date     = if ($M.date) { [string]$M.date } else { "1970-01-01" }
        author   = if ($M.author) { [string]$M.author } else { "WGC" }
        tags     = $Tags
        title    = if ($M.title) { [string]$M.title } else { [string]$M.id }
        excerpt  = if ($M.excerpt) { [string]$M.excerpt } else { "" }
        cover    = $Cover
    }
}

$Sorted = $Articles | Sort-Object { $_.date } -Descending
$Payload = @{ articles = @($Sorted) }
$Json = ($Payload | ConvertTo-Json -Depth 6)

New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
[System.IO.File]::WriteAllText($OutFile, $Json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$FallbackFile = Join-Path $Root "js\archive-data.js"
New-Item -ItemType Directory -Force -Path (Split-Path $FallbackFile) | Out-Null
$FallbackJson = ($Payload | ConvertTo-Json -Depth 6 -Compress)
[System.IO.File]::WriteAllText($FallbackFile, "window.ARCHIVE_ARTICLES_DATA = $FallbackJson;" + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$SitemapPath = Join-Path $Root "sitemap.xml"
$SitemapOrigin = "https://weirdgamesclub.com"
$StaticPages = @("", "index.html", "about.html", "archive.html", "forest.html", "humid-wilds.html")
$Xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"@
foreach ($Page in $StaticPages) {
    $Loc = if ($Page -eq "") { "$SitemapOrigin/" } else { "$SitemapOrigin/$Page" }
    $Xml += "`n  <url><loc>$Loc</loc></url>"
}
foreach ($Item in $Sorted) {
    $Xml += "`n  <url><loc>$SitemapOrigin/article.html?id=$($Item.id)</loc><lastmod>$($Item.date)</lastmod></url>"
}
$Xml += "`n</urlset>`n"
[System.IO.File]::WriteAllText($SitemapPath, $Xml, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $OutFile ($($Sorted.Count) articles)"
Write-Host "Wrote $FallbackFile"
Write-Host "Wrote $SitemapPath"

$BuildScript = Join-Path $Root "scripts\build.mjs"
if (Get-Command node -ErrorAction SilentlyContinue) {
  & node $BuildScript
} else {
  Write-Host "Tip: install Node.js and run 'node scripts/build.mjs' to sync games fallback too."
}
