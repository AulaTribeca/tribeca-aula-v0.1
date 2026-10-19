// Salida mínima para un repositorio público.
// No registrar errores Playwright completos, DOM, URLs, respuestas, tokens,
// datos personales, capturas, trazas, ni estados de autenticación.
export default class SafeQaReporter {
  onBegin(_config, suite) {
    const total = suite.allTests().length;
    console.log(`Auditoría Tribeca: ${total} pruebas preparadas.`);
  }

  onTestEnd(test, result) {
    const project = test.parent?.project()?.name || 'browser';
    const status = result.status === 'passed' ? 'OK'
      : result.status === 'skipped' ? 'OMITIDA' : 'FALLO';
    // Solo títulos definidos en el repositorio, nunca valores capturados del DOM.
    console.log(`[${project}] [${status}] ${test.title}`);
  }

  onError(_error) {
    console.log('Incidencia de ejecución. Revisar configuración del workflow.');
  }

  onEnd(result) {
    console.log(`Resultado final de auditoría: ${result.status}.`);
  }
}
