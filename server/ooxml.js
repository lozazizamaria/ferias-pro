"use strict";

/* ==========================================================================
   My Plan — Gerador Zero-Dependências de Word (.docx) e PowerPoint (.pptx)
   OOXML válido e 100% editável usando apenas Node.js nativo (Buffer)
   ========================================================================== */

function xmlEsc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanHexColor(col, fallback = "111111") {
  const s = String(col || "").trim();
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (m) return m[1].toUpperCase();
  const m3 = s.match(/^#?([0-9a-fA-F]{3})$/);
  if (m3) return m3[1].split("").map(c => c + c).join("").toUpperCase();
  return fallback;
}

function parseDataUrlImage(dataUrl) {
  const m = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  let ext = m[1].toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  if (ext === "webp") return null; // OOXML universal support: PNG/JPG
  const buf = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
  if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
  return { ext, mime: ext === "png" ? "image/png" : "image/jpeg", buf };
}

/* ==========================================================================
   1. GERADOR WORD (.docx) — OOXML EDITÁVEL
   ========================================================================== */
function buildDocxBuffer(docSpec, buildZipBuffer) {
  const spec = docSpec && typeof docSpec === "object" ? docSpec : {};
  const blocks = Array.isArray(spec.blocks) ? spec.blocks : [];
  const docTitle = String(spec.title || "Ata de Reunião").trim();

  const mediaFiles = [];
  const rels = [];
  let nextRelId = 2; // rId1 = styles.xml
  let nextImgId = 1;

  const addImage = (dataUrl) => {
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) return null;
    const idx = nextImgId++;
    const relId = `rId${nextRelId++}`;
    const target = `media/image${idx}.${parsed.ext}`;
    mediaFiles.push({ name: `word/${target}`, data: parsed.buf, ext: parsed.ext });
    rels.push({
      id: relId,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      target
    });
    return { relId, idx };
  };

  const renderRuns = (runs, defaultOpts = {}) => {
    const list = Array.isArray(runs) && runs.length
      ? runs
      : [{ text: String(runs || "") }];
    return list.map(r => {
      const txt = String(r?.text ?? "");
      if (!txt) return "";
      const bold = r.bold ?? defaultOpts.bold;
      const italic = r.italic ?? defaultOpts.italic;
      const underline = r.underline ?? defaultOpts.underline;
      const strike = r.strike ?? defaultOpts.strike;
      const color = r.color ? cleanHexColor(r.color, "111111") : (defaultOpts.color || "111111");
      const sizeHalfPt = Math.round((Number(r.sizePt || defaultOpts.sizePt || 11)) * 2);
      const rPr = [
        `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>`,
        bold ? "<w:b/>" : "",
        italic ? "<w:i/>" : "",
        underline ? '<w:u w:val="single"/>' : "",
        strike ? "<w:strike/>" : "",
        `<w:color w:val="${color}"/>`,
        `<w:sz w:val="${sizeHalfPt}"/><w:szCs w:val="${sizeHalfPt}"/>`
      ].filter(Boolean).join("");
      return `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${xmlEsc(txt)}</w:t></w:r>`;
    }).join("");
  };

  const alignMap = { left: "left", center: "center", right: "right", justify: "both", both: "both" };

  const bodyParts = [];
  blocks.forEach(b => {
    if (!b || typeof b !== "object") return;
    const type = String(b.type || "p");
    const jc = alignMap[b.align] || "left";

    if (type === "h1" || type === "h2" || type === "h3") {
      const sizes = { h1: 18, h2: 14, h3: 12 };
      const colors = { h1: "0F172A", h2: "1E3A8A", h3: "334155" };
      const spBefore = type === "h1" ? 200 : (type === "h2" ? 180 : 140);
      const spAfter = type === "h1" ? 100 : 80;
      const bdr = type === "h1"
        ? '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="CBD5E1"/></w:pBdr>'
        : "";
      bodyParts.push(
        `<w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:before="${spBefore}" w:after="${spAfter}"/>${bdr}</w:pPr>`
        + renderRuns(b.runs || [{ text: b.text || "" }], { bold: true, sizePt: sizes[type], color: colors[type] })
        + `</w:p>`
      );
      return;
    }

    if (type === "hr") {
      bodyParts.push(
        `<w:p><w:pPr><w:spacing w:before="80" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr></w:pPr></w:p>`
      );
      return;
    }

    if (type === "quote") {
      bodyParts.push(
        `<w:p><w:pPr><w:ind w:left="420"/><w:spacing w:before="80" w:after="80"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="2563EB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:pPr>`
        + renderRuns(b.runs || [{ text: b.text || "" }], { italic: true, sizePt: 10.5, color: "334155" })
        + `</w:p>`
      );
      return;
    }

    if (type === "bullet" || type === "number" || type === "task") {
      const prefix = type === "task"
        ? (b.checked ? "☑ " : "☐ ")
        : (type === "number" ? `${b.index || 1}. ` : "• ");
      const runs = [{ text: prefix, bold: type === "number" }, ...(Array.isArray(b.runs) && b.runs.length ? b.runs : [{ text: b.text || "" }])];
      bodyParts.push(
        `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:before="40" w:after="40"/></w:pPr>`
        + renderRuns(runs, { sizePt: 11, color: "111111" })
        + `</w:p>`
      );
      return;
    }

    if (type === "table" && Array.isArray(b.rows) && b.rows.length) {
      const rowsXml = b.rows.map((row, rIdx) => {
        const isHdr = rIdx === 0;
        const cellsXml = (Array.isArray(row) ? row : []).map(cell => {
          const fill = isHdr ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : "";
          return `<w:tc><w:tcPr>${fill}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar></w:tcPr>`
            + `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>`
            + renderRuns([{ text: String(cell ?? "") }], { bold: isHdr, sizePt: 10, color: isHdr ? "0F172A" : "1E293B" })
            + `</w:p></w:tc>`;
        }).join("");
        return `<w:tr>${cellsXml}</w:tr>`;
      }).join("");
      bodyParts.push(
        `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>`
        + `<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`
        + `<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`
        + `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`
        + `<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`
        + `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>`
        + `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>`
        + `</w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`
      );
      return;
    }

    if (type === "image" && b.dataUrl) {
      const img = addImage(b.dataUrl);
      if (img) {
        const cx = 4800000; // ~5.25 in
        const cy = 2700000; // ~2.95 in
        bodyParts.push(
          `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="100" w:after="60"/></w:pPr><w:r><w:drawing>`
          + `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">`
          + `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${img.idx}" name="Imagem ${img.idx}"/>`
          + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`
          + `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
          + `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`
          + `<pic:nvPicPr><pic:cNvPr id="${img.idx}" name="img${img.idx}"/><pic:cNvPicPr/></pic:nvPicPr>`
          + `<pic:blipFill><a:blip r:embed="${img.relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
          + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
          + `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
        );
        if (b.caption) {
          bodyParts.push(
            `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="100"/></w:pPr>`
            + renderRuns([{ text: b.caption }], { italic: true, sizePt: 9.5, color: "64748B" })
            + `</w:p>`
          );
        }
      }
      return;
    }

    // Parágrafo padrão
    bodyParts.push(
      `<w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:before="40" w:after="90"/></w:pPr>`
      + renderRuns(b.runs || [{ text: b.text || "" }], { sizePt: 11, color: "111111" })
      + `</w:p>`
    );
  });

  const hasPng = mediaFiles.some(m => m.ext === "png");
  const hasJpg = mediaFiles.some(m => m.ext === "jpg");
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  ${hasJpg ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ""}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${rels.map(r => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join("")}
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:color w:val="111111"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyParts.join("\n    ")}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
  </w:body>
</w:document>`;

  const zipEntries = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRelsXml, "utf8") },
    { name: "word/_rels/document.xml.rels", data: Buffer.from(docRelsXml, "utf8") },
    { name: "word/styles.xml", data: Buffer.from(stylesXml, "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
    ...mediaFiles.map(m => ({ name: m.name, data: m.data }))
  ];
  return { buffer: buildZipBuffer(zipEntries), title: docTitle };
}

/* ==========================================================================
   2. GERADOR POWERPOINT (.pptx) — CLEAN (FUNDO #FFFFFF, LETRA #111111, 16:9)
   ========================================================================== */
function buildPptxBuffer(deckSpec, buildZipBuffer) {
  const spec = deckSpec && typeof deckSpec === "object" ? deckSpec : {};
  const slides = Array.isArray(spec.slides) && spec.slides.length
    ? spec.slides
    : [{ kind: "cover", title: spec.title || "Apresentação", subtitle: "", bullets: [] }];

  const W = 12192000; // 13.333 in (16:9 widescreen)
  const H = 6858000;  // 7.5 in
  const mediaFiles = [];
  let imgCounter = 1;

  const makeTextShape = (id, name, x, y, cx, cy, paragraphsXml) => `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/><a:lstStyle/>${paragraphsXml}</p:txBody>
    </p:sp>`;

  const makePara = (text, { sizePt = 18, bold = false, color = "111111", align = "l", bullet = false, spaceAfter = 120 } = {}) => {
    const algn = align === "center" ? "ctr" : (align === "right" ? "r" : "l");
    const buXml = bullet ? `<a:buChar char="•"/>` : `<a:buNone/>`;
    const marL = bullet ? ` marL="285750" indent="-171450"` : "";
    return `<a:p><a:pPr algn="${algn}"${marL}><a:spcAft><a:spcPts val="${spaceAfter}"/></a:spcAft>${buXml}</a:pPr>`
      + `<a:r><a:rPr lang="pt-BR" sz="${Math.round(sizePt * 100)}" b="${bold ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr>`
      + `<a:t>${xmlEsc(text)}</a:t></a:r></a:p>`;
  };

  const slideXmlFiles = [];
  const slideRelsFiles = [];

  slides.forEach((sl, idx) => {
    const sNum = idx + 1;
    const shapes = [];
    const sRels = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`
    ];

    if (sl.kind === "cover" || idx === 0) {
      // Slide 1: Capa Clean — Fundo 100% branco, Título do Cartão em destaque preto, subtítulo/metadados
      shapes.push(makeTextShape(2, "Titulo", 914400, 1950000, 10363200, 1800000,
        makePara(sl.title || "Apresentação", { sizePt: 38, bold: true, color: "111111", align: "center", spaceAfter: 180 })
      ));
      const subLines = [sl.subtitle, ...(Array.isArray(sl.metaLines) ? sl.metaLines : [])].filter(Boolean);
      if (subLines.length) {
        shapes.push(makeTextShape(3, "Subtitulo", 1371600, 3850000, 9448800, 1800000,
          subLines.map((ln, i) => makePara(ln, { sizePt: i === 0 ? 18 : 14, bold: i === 0, color: i === 0 ? "111111" : "444444", align: "center", spaceAfter: 100 })).join("")
        ));
      }
    } else {
      // Slide padrão (Roteiro, Tópicos, Decisões) — Ultra Clean
      shapes.push(makeTextShape(2, "Titulo", 762000, 480000, 10668000, 900000,
        makePara(sl.title || `Tópico ${sNum}`, { sizePt: 28, bold: true, color: "111111", align: "l", spaceAfter: 60 })
      ));

      // Linha divisória fina sob o título
      shapes.push(`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="3" name="Linha"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="762000" y="1380000"/><a:ext cx="10668000" cy="18000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></p:spPr>
        </p:sp>`);

      const imgParsed = sl.imageDataUrl ? parseDataUrlImage(sl.imageDataUrl) : null;
      const textWidth = imgParsed ? 6100000 : 10668000;
      const bullets = Array.isArray(sl.bullets) ? sl.bullets.filter(Boolean).slice(0, 10) : [];
      const bulletSize = bullets.length > 6 ? 15 : 18;
      const parasXml = bullets.length
        ? bullets.map((b, bi) => makePara(
            sl.kind === "agenda" ? `${bi + 1}.  ${b}` : b,
            { sizePt: bulletSize, bold: false, color: "111111", align: "l", bullet: sl.kind !== "agenda", spaceAfter: 160 }
          )).join("")
        : makePara(sl.subtitle || "", { sizePt: 18, color: "111111" });

      shapes.push(makeTextShape(4, "Conteudo", 762000, 1650000, textWidth, 4550000, parasXml));

      if (imgParsed) {
        const iId = imgCounter++;
        const rId = "rId2";
        const fname = `image${iId}.${imgParsed.ext}`;
        mediaFiles.push({ name: `ppt/media/${fname}`, data: imgParsed.buf, ext: imgParsed.ext });
        sRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${fname}"/>`);
        shapes.push(`
          <p:pic>
            <p:nvPicPr><p:cNvPr id="5" name="Imagem ${iId}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
            <p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
            <p:spPr><a:xfrm><a:off x="7162800" y="1750000"/><a:ext cx="4267200" cy="3400000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          </p:pic>`);
      }

      // Rodapé discreto com número do slide
      shapes.push(makeTextShape(6, "Rodape", 10400000, 6350000, 1030000, 320000,
        makePara(`${sNum} / ${slides.length}`, { sizePt: 10, color: "666666", align: "right", spaceAfter: 0 })
      ));
    }

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${shapes.join("\n")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

    slideXmlFiles.push({ name: `ppt/slides/slide${sNum}.xml`, data: Buffer.from(slideXml, "utf8") });
    slideRelsFiles.push({
      name: `ppt/slides/_rels/slide${sNum}.xml.rels`,
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sRels.join("")}</Relationships>`, "utf8")
    });
  });

  const hasPng = mediaFiles.some(m => m.ext === "png");
  const hasJpg = mediaFiles.some(m => m.ext === "jpg");
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  ${hasJpg ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ""}
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n  ")}
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n  ")}
</Relationships>`;

  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst>
  <p:sldSz cx="${W}" cy="${H}" type="screen16x9"/>
  <p:notesSz cx="${H}" cy="${W}"/>
</p:presentation>`;

  const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

  const slideMasterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

  const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

  const slideLayoutRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MyPlanClean">
  <a:themeElements>
    <a:clrScheme name="Clean">
      <a:dk1><a:srgbClr val="111111"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="0284C7"/></a:accent2>
      <a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4>
      <a:accent5><a:srgbClr val="7C3AED"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Clean"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Clean"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;

  const zipEntries = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRelsXml, "utf8") },
    { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presRelsXml, "utf8") },
    { name: "ppt/presentation.xml", data: Buffer.from(presXml, "utf8") },
    { name: "ppt/slideMasters/slideMaster1.xml", data: Buffer.from(slideMasterXml, "utf8") },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: Buffer.from(slideMasterRelsXml, "utf8") },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: Buffer.from(slideLayoutXml, "utf8") },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: Buffer.from(slideLayoutRelsXml, "utf8") },
    { name: "ppt/theme/theme1.xml", data: Buffer.from(themeXml, "utf8") },
    ...slideXmlFiles,
    ...slideRelsFiles,
    ...mediaFiles.map(m => ({ name: m.name, data: m.data }))
  ];
  return { buffer: buildZipBuffer(zipEntries), slidesCount: slides.length };
}

module.exports = { buildDocxBuffer, buildPptxBuffer };
