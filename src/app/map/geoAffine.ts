import * as math from 'mathjs';

export class GeoAffine {
    options = {};
    // similarity: any;
    similarity: false;
    matrix: false | number[] = [1, 0, 0, 0, 1, 0];
    hasControlPoints = false;
    a_: any;
    sc_: any;
    tr_: any;

    setControlPoints =(xy: any, XY: any)=> {
        if (xy.length < 2) {
            this.matrix = [1, 0, 0, 0, 1, 0];
            this.hasControlPoints = false;
        }
        else {

            // Create the matrix A and vector B
            const A = math.matrix(xy.map(p => [p[0], p[1], 1]));
            const Bx = math.matrix(XY.map(p => p[0]));
            const By = math.matrix(XY.map(p => p[1]));

            // Solve for coefficients for x and y separately
            // const coefficientsX = math.lusolve(A, Bx);
            // const coefficientsY = math.lusolve(A, By);

            // Solve for coefficients using least squares
            const coefficientsX = math.lusolve(math.multiply(math.transpose(A), A), math.multiply(math.transpose(A), Bx));
            const coefficientsY = math.lusolve(math.multiply(math.transpose(A), A), math.multiply(math.transpose(A), By));


            // Extract the values
            // const [a, b, c] = coefficientsX.map(x => x[0]);
            // const [d, e, f] = coefficientsY.map(y => y[0]);
            const coefX = coefficientsX.toArray();
            const coefY = coefficientsY.toArray();

            const a = coefX[0][0] as number;
            const b = coefX[1][0] as number;
            const c = coefX[2][0] as number;

            const d = coefY[0][0] as number;
            const e = coefY[1][0] as number;
            const f = coefY[2][0] as number;


            this.matrix = [a, b, c, d, e, f];
            console.log(this.matrix);

            // Rotation angle in radians
            const theta = Math.atan2(d, a);
            console.log(theta);
            console.log(Math.atan2(b, e))
            this.a_ = theta;            

            // Scaling factors
            const scaleX = Math.sqrt(a * a + b * b);
            const scaleY = Math.sqrt(d * d + e * e);
            this.sc_ = [scaleX, scaleY];

            // Translation (center point)
            this.tr_ = [c, f];

            this.hasControlPoints = true;
        }
        return this.hasControlPoints;
    }

    transform =(xy: number[])=> {
        var m = this.matrix;
         
        return [m[0] * xy[0] + m[1] * xy[1] + m[2], m[3] * xy[0] + m[4] * xy[1] + m[5]];
    }
    /** Get the rotation of the transform
    * @return {Number}: angle
    */
    getRotation = () => {
        return this.a_;
    }

    /** Get the scale of the transform
    * @return {ol.Coordinate}: scale along x and y axis
    */
    getScale = () => {
        return this.sc_
    }

    /** Get the rotation of the translation
    * @return {ol.Coordinate}: translation
    */
    getTranslation = () => {
        return this.tr_;
    }
    getMatrix = () => {
        return this.matrix;
    }
}