    /** Helmert transformation is a transformation method within a three-dimensional space. 
    *	It is frequently used in geodesy to produce distortion-free transformations from one datum to another. 
    *	It is composed of scaling o rotation o translation
    *	Least squares is used to solve the problem of determining the parameters.
    *	[X] = [sx] . [cos -sin] + [tx]
    *	[Y]   [sy]   [sin  cos]   [ty]
    *	
    *	With the similarity option the scale is the same along both axis ie. sx = sy
    */

export class GeoReference {

    options = {};
    similarity: any;
    matrix: false | number[] = [1, 0, 0, 0, 1, 0];
    hasControlPoints = false;
    a_: any;
    sc_: any;
    tr_: any;

    /** Calculate the helmert transform with control points.    
    */
    setControlPoints =(xy: any, XY: any)=> {
        if (xy.length < 2) {
            this.matrix = [1, 0, 0, 0, 1, 0];
            this.hasControlPoints = false;
        }
        else {
            let aaa: any;
            let yyy: any;
            if (this.similarity || xy.length < 3) this.matrix = this._similarity(xy, XY) as number[];
            else this.matrix = this._helmert(xy, XY, aaa, yyy) as number[];
            this.hasControlPoints = true;
        }
        return this.hasControlPoints;
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

    /** Transform a point 
    * @param {ol.Coordinate}: coordinate in the origin datum 
    * @return {ol.Coordinate}: coordinate in the destination datum 
    */
    transform =(xy: number[])=> {
        var m = this.matrix;
        return [m[0] * xy[0] + m[1] * xy[1] + m[2], m[3] * xy[0] + m[4] * xy[1] + m[5]];
    }

    
    /** Revers transform of a point 
    * @param {ol.Coordinate}: coordinate in the destination datum
    * @return {ol.Coordinate}: coordinate in the origin datum
    */
    revers =(xy: number[])=> {
        var a = this.matrix[0];
        var b = this.matrix[1];
        var c = this.matrix[3];
        var d = this.matrix[4];
        var p = this.matrix[2];
        var q = this.matrix[5];
        return [
            (d * xy[0] - b * xy[1] + b * q - p * d) / (a * d - b * c),
            (-c * xy[0] + a * xy[1] + c * p - a * q) / (a * d - b * c),
        ];
    }

    /**
    Transformee de Helmert au moindre carre :
        Somme ( carre (a*xy + b - XY) ) minimale
        avec A de la forme :
        [a -b]
        [b  a]
    **/
   
    _similarity = (xy: string | any[], XY: string | any[]) =>  {
        if (!xy.length || xy.length != XY.length) {
            console.log("Helmert : Taille des tableaux de points incompatibles");
            return false;
        }
        var i: number;					// Variable de boucle
        var n = XY.length;		// nb points de calage
        var a = 1, b = 0, p = 0, q = 0;

        // Barycentre
        var mxy = { x: 0, y: 0 };
        var mXY = { x: 0, y: 0 };
        for (i = 0; i < n; i++) {
            mxy.x += xy[i][0];
            mxy.y += xy[i][1];
            mXY.x += XY[i][0];
            mXY.y += XY[i][1];
        }
        mxy.x /= n;
        mxy.y /= n;
        mXY.x /= n;
        mXY.y /= n;

        // Ecart au barycentre
        var xy0 = [], XY0 = [];
        for (i = 0; i < n; i++) {
            xy0.push({ x: xy[i][0] - mxy.x, y: xy[i][1] - mxy.y });
            XY0.push({ x: XY[i][0] - mXY.x, y: XY[i][1] - mXY.y });
        }

        // Resolution
        var SxX: number, SxY: number, SyY: number, SyX: number, Sx2: number, Sy2: number;
        SxX = SxY = SyY = SyX = Sx2 = Sy2 = 0;
        for (i = 0; i < n; i++) {
            SxX += xy0[i].x * XY0[i].x;
            SxY += xy0[i].x * XY0[i].y;
            SyY += xy0[i].y * XY0[i].y;
            SyX += xy0[i].y * XY0[i].x;
            Sx2 += xy0[i].x * xy0[i].x;
            Sy2 += xy0[i].y * xy0[i].y;
        }

        // Coefficients
        a = (SxX + SyY) / (Sx2 + Sy2);
        b = (SxY - SyX) / (Sx2 + Sy2);
        p = mXY.x - a * mxy.x + b * mxy.y;
        q = mXY.y - b * mxy.x - a * mxy.y;

        // la Solution
        this.matrix = [a, -b, p, b, a, q];

        var sc = Math.sqrt(a * a + b * b)
        this.a_ = Math.acos(a / sc);
        if (b > 0) this.a_ *= -1;
        this.sc_ = [sc, sc];
        this.tr_ = [p, q];        

        return this.matrix;
    }


    /**
    Helmert-Extended Least Square Transform:
        Somme ( carre (a*xy + b - XY) ) minimale
        avec A de la forme :
        [a -b][k 0]
        [b  a][0 h]
    **/

    _helmert =(xy: any, XY: any, poids: any, tol: any)=> {
        if (!xy.length || xy.length != XY.length) {
            console.log("Helmert : Taille des tableaux de points incompatibles");
            return [];
        }
        var i: number;					// Loop variable
        var n = xy.length;		// number of setting points
        // Creating default weights
        if (!poids) poids = [];
        if (poids.length == 0 || n != poids.iGetTaille()) {
            for (i = 0; i < n; i++) poids.push(1.0);
        }

        var a: number, b: number, k: number, h: number, tx: number, ty: number;
        if (!tol) tol = 0.0001;

        // Initialisation (sur une similitude)
        var affine = this._similarity(xy, XY);
        a = affine[0];
        b = -affine[1];
        k = h = Math.sqrt(a * a + b * b);
        a /= k;
        b /= k;
        tx = affine[2];
        ty = affine[5];

        // Barycentre
        var mxy = { x: 0, y: 0 };
        var mXY = { x: 0, y: 0 };
        for (i = 0; i < n; i++) {
            mxy.x += xy[i][0];
            mxy.y += xy[i][1];
            mXY.x += XY[i][0];
            mXY.y += XY[i][1];
        }
        mxy.x /= n;
        mxy.y /= n;
        mXY.x /= n;
        mXY.y /= n;

        // Deviation from barycenter
        var xy0 = [], XY0 = [];
        for (i = 0; i < n; i++) {
            xy0.push({ x: xy[i][0] - mxy.x, y: xy[i][1] - mxy.y });
            XY0.push({ x: XY[i][0] - mXY.x, y: XY[i][1] - mXY.y });
        }

        // Variables
        var Sx: number, Sy: number, Sxy: number, SxX: number, SxY: number, SyX: number, SyY: number;
        Sx = Sy = Sxy = SxX = SxY = SyX = SyY = 0;
        for (i = 0; i < n; i++) {
            Sx += xy0[i].x * xy0[i].x * poids[i];
            Sxy += xy0[i].x * xy0[i].y * poids[i];
            Sy += xy0[i].y * xy0[i].y * poids[i];
            SxX += xy0[i].x * XY0[i].x * poids[i];
            SyX += xy0[i].y * XY0[i].x * poids[i];
            SxY += xy0[i].x * XY0[i].y * poids[i];
            SyY += xy0[i].y * XY0[i].y * poids[i];
        }

        // Iterations
        var dk: number, dh: number, dt: number;
        var A: number, B: number, C: number, D: number, E: number, F: number, G: number, H: number;
        var da: number, db: number;
        var div = 1e10;

        do {
            A = Sx;
            B = Sy;
            C = k * k * Sx + h * h * Sy;
            D = -h * Sxy;
            E = k * Sxy;
            F = a * SxX + b * SxY - k * Sx;
            G = -b * SyX + a * SyY - h * Sy;
            H = -k * b * SxX + k * a * SxY - h * a * SyX - h * b * SyY;

            // 
            dt = (A * B * H - B * D * F - A * E * G) / (A * B * C - B * D * D - A * E * E);
            dk = (F - D * dt) / A;
            dh = (G - E * dt) / A;

            // Numerical divergence problem
            if (Math.abs(dk) + Math.abs(dh) > div) break;

            // New approximation
            da = a * Math.cos(dt) - b * Math.sin(dt);
            db = b * Math.cos(dt) + a * Math.sin(dt);
            a = da;
            b = db;
            k += dk;
            h += dh;

            div = Math.abs(dk) + Math.abs(dh);
        } while (Math.abs(dk) + Math.abs(dh) > tol);

        // Return of the barycentric frame
        tx = mXY.x - a * k * mxy.x + b * h * mxy.y;
        ty = mXY.y - b * k * mxy.x - a * h * mxy.y;

        this.a_ = Math.acos(a);
        if (b > 0) this.a_ *= -1;
        if (Math.abs(this.a_) < Math.PI / 8) {
            this.a_ = Math.asin(-b);
            if (a < 0) this.a_ = Math.PI - this.a_;
        }
        this.sc_ = [k, h];
        this.tr_ = [tx, ty];

        // la Solution
        this.matrix = [];
        this.matrix[0] = a * k;
        this.matrix[1] = -b * h;
        this.matrix[2] = tx;
        this.matrix[3] = b * k;
        this.matrix[4] = a * h;
        this.matrix[5] = ty;
        return this.matrix;
    }

}
