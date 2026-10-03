<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap - Saver For TUBE</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #27272a;
            background-color: #fafafa;
            padding: 30px 20px;
            line-height: 1.5;
          }
          .container {
            max-width: 1050px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            border-radius: 16px;
            padding: 28px 32px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f4f4f5;
            padding-bottom: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .title-area h1 {
            font-size: 22px;
            font-weight: 800;
            color: #09090b;
            letter-spacing: -0.02em;
          }
          .title-area h1 span {
            color: #dc2626;
          }
          .title-area p {
            font-size: 13px;
            color: #71717a;
            margin-top: 4px;
          }
          .badge-count {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
            margin-top: 10px;
          }
          th {
            background-color: #f4f4f5;
            color: #3f3f46;
            font-weight: 700;
            padding: 12px 14px;
            border-top: 1px solid #e4e4e7;
            border-bottom: 1px solid #e4e4e7;
          }
          th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
          th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
          td {
            padding: 12px 14px;
            border-bottom: 1px solid #f4f4f5;
            color: #52525b;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: #fcfcfc;
          }
          td a {
            color: #09090b;
            text-decoration: none;
            font-weight: 600;
            word-break: break-all;
          }
          td a:hover {
            color: #dc2626;
            text-decoration: underline;
          }
          .priority-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            background: #ecfdf5;
            color: #059669;
          }
          .priority-badge.high {
            background: #fef2f2;
            color: #dc2626;
          }
          .footer-note {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #f4f4f5;
            font-size: 11px;
            color: #a1a1aa;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title-area">
              <h1>Saver For <span>TUBE</span> XML Sitemap</h1>
              <p>Standard XML Sitemap generated for Search Engines (Google, Bing, Yandex, Yahoo).</p>
            </div>
            <div class="badge-count">
              Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 55%;">URL</th>
                <th style="width: 15%;">Priority</th>
                <th style="width: 15%;">Change Freq</th>
                <th style="width: 15%;">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <xsl:variable name="itemURL">
                      <xsl:value-of select="sitemap:loc"/>
                    </xsl:variable>
                    <a href="{$itemURL}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <span class="priority-badge">
                      <xsl:if test="sitemap:priority &gt;= 0.9">
                        <xsl:attribute name="class">priority-badge high</xsl:attribute>
                      </xsl:if>
                      <xsl:value-of select="sitemap:priority"/>
                    </span>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <div class="footer-note">
            <span>© 2026 Saver For TUBE (saverfortube.com)</span>
            <span>Formatted via XSL Stylesheet</span>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
