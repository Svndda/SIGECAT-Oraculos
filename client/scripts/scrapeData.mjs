import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'node-html-parser';

async function scrapeClases() {
  try {
    console.log('Extracting Occupational Classes...');
    const response = await fetch('https://plataformaorh.ucr.ac.cr/ManualClases/IndexManual');
    const html = await response.text();
    const root = parse(html);

    const clases = [];
    const rows = root.querySelectorAll('table tbody tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const codigo = cells[0]?.text?.trim() || '';
        const estrato = cells[1]?.text?.trim() || '';
        const descripcion = cells[2]?.text?.trim() || '';

        if (codigo) {
          clases.push({
            id: codigo,
            codigo,
            estrato,
            descripcion,
          });
        }
      }
    });

    // Save to file
    const outputPath = path.join(process.cwd(), 'src', 'data', 'classes.json');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(clases, null, 2));
    console.log(`✓ ${clases.length} Classes extracted and saved to src/data/classes.json`);

    return clases;
  } catch (error) {
    console.error('Error extracting classes:', error);
    return [];
  }
}

async function scrapeCargos() {
  try {
    console.log('Extracting Jobs/Positions...');
    const response = await fetch('https://plataformaorh.ucr.ac.cr/ManualClases/IndexManualCargos');
    const html = await response.text();
    const root = parse(html);

    const cargos = [];
    const rows = root.querySelectorAll('table tbody tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const codigo = cells[0]?.text?.trim() || '';
        const clase = cells[1]?.text?.trim() || '';
        const nombre = cells[2]?.text?.trim() || '';
        const descripcion = cells[3]?.text?.trim() || '';

        if (codigo && nombre) {
          cargos.push({
            id: codigo,
            codigo,
            clase,
            nombre,
            descripcion,
          });
        }
      }
    });

    // Save to file
    const outputPath = path.join(process.cwd(), 'src', 'data', 'jobs.json');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(cargos, null, 2));
    console.log(`✓ ${cargos.length} Jobs extracted and saved to src/data/jobs.json`);

    return cargos;
  } catch (error) {
    console.error('Error extracting jobs:', error);
    return [];
  }
}

async function main() {
  console.log('Starting UCR data scraping...\n');
  await scrapeClases();
  await scrapeCargos();
  console.log('\n✓ Scraping completed successfully');
}

main();
