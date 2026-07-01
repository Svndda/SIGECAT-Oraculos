<?php
require 'vendor/autoload.php';

use SebastianBergmann\CodeCoverage\CodeCoverage;
use SebastianBergmann\CodeCoverage\Data\RawCodeCoverageData;
use SebastianBergmann\CodeCoverage\Driver\Selector;
use SebastianBergmann\CodeCoverage\Filter;
use SebastianBergmann\CodeCoverage\Report\Html\Facade as HtmlReport;
// 1. Importamos el iterador de archivos y el formato de datos crudo de la v11
use SebastianBergmann\FileIterator\Facade as FileIteratorFacade;

$filter = new Filter;

// 2. SOLUCIÓN AL ERROR: Buscamos dinámicamente los archivos en lugar de usar el directorio
$fileIterator = new FileIteratorFacade;
$archivosApi = $fileIterator->getFilesAsArray(__DIR__ . '/src', '.php');
$filter->includeFiles($archivosApi);

$driver = (new Selector)->forLineCoverage($filter);
$coverage = new CodeCoverage($driver, $filter);

// Leer todos los JSON generados por Newman
$files = glob(__DIR__ . '/coverage_data/*.json');
foreach ($files as $file) {
  $data = json_decode(file_get_contents($file), true);

  if (is_array($data)) {
    // 3. PREVENCIÓN DEL SIGUIENTE ERROR: Convertimos el array normal de PHP
    // a la estructura estricta que exige la librería en su versión 11.
    $rawData = RawCodeCoverageData::fromXdebugWithoutPathCoverage($data);
    $coverage->append($rawData, 'Postman Newman Test');
  }
}

// Generar el reporte HTML en la carpeta "reporte-cobertura"
(new HtmlReport)->process($coverage, __DIR__ . '/reporte-cobertura');

echo "¡Reporte de cobertura PHP generado con éxito en /reporte-cobertura!\n";