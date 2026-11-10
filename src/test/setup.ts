import "@testing-library/jest-dom/vitest";

// --- SOLUCIÓN DEFINITIVA PARA EL ERROR DEL GANTT EN JSDOM ---
if (typeof SVGSVGElement !== 'undefined' && !SVGSVGElement.prototype.createSVGPoint) {
  SVGSVGElement.prototype.createSVGPoint = function () {
    return {
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: 0, y: 0 };
      },
    } as unknown as DOMPoint;
  };
}

if (typeof SVGSVGElement !== 'undefined' && !SVGSVGElement.prototype.getScreenCTM) {
  SVGSVGElement.prototype.getScreenCTM = () =>
    ({ inverse: () => ({}) }) as unknown as DOMMatrix;
}
// ------------------------------------------------------------