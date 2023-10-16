/* istanbul ignore file */
// Ignore since not in use
const fs = require("fs");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");

export const saveToPdf = (path: string, svg: string) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(path);

    SVGtoPDF(doc, svg, 0, 0, { useCSS: true });

    stream.on("finish", () => {
      fs.readFileSync("file.pdf");
      resolve(null);
    });
    stream.on("error", (error) => {
      reject(error);
    });

    doc.pipe(stream);
    doc.end();
  });
};
