Object.assign(MCG.Infill, (function() {

  var Types = {
    none: 0,
    linear: 1,
    triangle: 2,
    hex: 4
  };

  function generate(contour, type, params) {
    params = params || {};

    if (type === Types.linear) {
      return generateLinear(contour, params.angle, params.spacing, params.parity);
    }
    if (type === Types.triangle) {
      return generateTriangle(contour, params.spacing);
    }
    if (type === Types.hex) {
      return generateTriangle(contour, params.spacing, params.linewidth, params.parity);
    }

    return null;
  }

  function generateLinear(contour, angle, spacing, parity) {
    context = contour.context;
    angle = angle || 0;
    spacing = spacing || context.p;
    parity = parity || 0;

    // constants
    var pi = Math.PI;
    var pi2 = pi * 2;
    var pi_2 = pi / 2;

    // rotate by 90 degrees if nonzero parity
    if (parity !== 0) angle += pi_2;

    var contourRotated = contour.clone(true).rotate(angle);

    var op = MCG.Sweep.Operations.linearInfill({
      spacing: spacing
    });

    var infillRotated = MCG.Sweep.sweep(op, contourRotated).infill;

    return infillRotated.rotate(-angle);
  }

  return {
    Types: Types,
    generate: generate
  }

})());