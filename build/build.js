"use strict";
var Agent = (function () {
    function Agent(pos) {
        this.pos = pos.copy();
        this.movementPhase = random(10000);
        this.ray = new Ray(this.pos, { target: mousePosAsVector() });
    }
    Agent.prototype.draw = function () {
        var targetPos = mousePosAsVector();
        var o = this.pos;
        noStroke();
        push();
        translate(o.x, o.y);
        scale(2);
        var brightness;
        var visible = this.ray.canSeePoint(targetPos);
        if (!visible) {
            brightness = 20;
            textSize(24);
            fill(100, 100, 100, 30);
            text("?", -6, 8);
        }
        else {
            var distToTarget = this.pos.dist(targetPos);
            brightness = map(distToTarget, 0, max(width, height), 255, 0);
            colorMode(RGB);
            var litColor = color(224, 228, 204, brightness);
            fill(litColor);
            circle(0, 0, 8);
            fill(0, 0, 0, 40);
            rectMode(CENTER);
            rect(0, 3, 5, 2);
            circle(-2, -1, 1);
            circle(2, -1, 1);
        }
        pop();
    };
    Agent.prototype.setPosition = function (pos) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    };
    Agent.createRandom = function () {
        return new Agent(randomScreenPosition());
    };
    Agent.prototype.update = function (walls, targetPos) {
        var offset = createVector(0, 0);
        offset.x = map(noise(this.movementPhase + 33333 + frameCount / 100), 0, 1, -1, 1);
        offset.y = map(noise(this.movementPhase + frameCount / 100), 0, 1, -1, 1);
        this.setPosition(this.pos.copy().add(offset));
        this.ray = new Ray(this.pos, { target: targetPos, walls: walls });
    };
    return Agent;
}());
function makeDistancesBuffer(rays) {
    return generateDataFromRays(rays);
}
function colorForPoint(_a, origin) {
    var c = _a.color, pt = _a.pt;
    var dist = origin.dist(pt);
    var lightness = map(dist, 0, width, 50, 3);
    colorMode(RGB);
    var _b = [hue(c), saturation(c)], h = _b[0], s = _b[1];
    colorMode(HSL, 100);
    return color(h, s, lightness);
}
function generateDataFromRays(rays) {
    return {
        values: rays.map(function (ray) {
            var nearest = ray.nearestIntersection();
            return nearest
                ? {
                    distance: nearest.pt.dist(ray.origin),
                    color: colorForPoint(nearest, ray.origin)
                }
                : { distance: width * 1.5, color: color("black") };
        })
    };
}
function drawDistancesBuffer(distantPoints) {
    var numStrips = distantPoints.values.length;
    var stripSpacing = width / numStrips;
    var stripWidth = ceil(stripSpacing);
    distantPoints.values.forEach(function (_a, ix) {
        var distance = _a.distance, color = _a.color;
        var x = ix * stripWidth;
        var distSq = distance ^ 2;
        var maxHeight = height * 0.7;
        var maxHeightSq = maxHeight ^ 2;
        var y = map(distSq, 0, width, maxHeightSq, 0);
        noStroke();
        fill(color);
        rectMode(CENTER);
        rect(x, height / 2, stripWidth, y);
    });
}
var Palette = (function () {
    function Palette() {
    }
    Palette.getColors = function () {
        return [
            color(250, 105, 0),
            color(105, 210, 231),
            color(167, 219, 216),
            color(243, 134, 48)
        ];
    };
    Palette.randomColor = function () {
        return random(Palette.getColors());
    };
    return Palette;
}());
var Particle = (function () {
    function Particle(pos) {
        this.pos = pos.copy();
        this.heading = 0;
    }
    Particle.prototype.draw = function () {
        noStroke();
        fill("black");
        rectMode(CENTER);
        square(this.pos.x, this.pos.y, 3);
        fill(0, 20);
    };
    Particle.prototype.update = function () {
        var mouseMovementAngle = angleOfLastMouseMovement();
        if (mouseMovementAngle !== undefined) {
            this.heading = mouseMovementAngle;
        }
    };
    Particle.prototype.setPosition = function (pos) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
    };
    Particle.createRandom = function () {
        return new Particle(randomScreenPosition());
    };
    return Particle;
}());
var defaultRenderingOptions = {
    drawGhostRay: false,
    drawRayToFirstIntersection: true,
    drawAllIntersections: false,
    drawFirstIntersection: true
};
var renderingOptions = randomRenderingOptions();
function randomiseRenderingOptions() {
    renderingOptions = randomRenderingOptions();
}
function randomRenderingOptions() {
    return {
        drawGhostRay: randomBoolean(),
        drawRayToFirstIntersection: randomBoolean(),
        drawAllIntersections: randomBoolean(),
        drawFirstIntersection: randomBoolean()
    };
}
var Ray = (function () {
    function Ray(origin, _a) {
        var _b = _a.angleRads, angleRads = _b === void 0 ? null : _b, _c = _a.target, target = _c === void 0 ? null : _c, _d = _a.walls, walls = _d === void 0 ? [] : _d;
        this.origin = origin.copy();
        if (target !== null) {
            this.lookAt(target);
        }
        else {
            this.angleRads = p5.Vector.fromAngle(angleRads);
        }
        this.intersectionPoints = [];
        this.recalculateFarEnd();
        if (walls.length > 0) {
            this.recalculateIntersections(walls);
        }
    }
    Ray.prototype.lookAt = function (targetPos) {
        var deltaToTarget = targetPos.copy().sub(this.origin);
        var angleToTarget = atan2(deltaToTarget.y, deltaToTarget.x);
        this.angleRads = p5.Vector.fromAngle(angleToTarget);
        this.recalculateFarEnd();
    };
    Ray.createRandom = function () {
        return new Ray(randomScreenPosition(), { angleRads: random(0, TWO_PI) });
    };
    Ray.prototype.intersectionWithWall = function (wall) {
        var answer = collideLineLine(wall.a.x, wall.a.y, wall.b.x, wall.b.y, this.origin.x, this.origin.y, this.farEnd.x, this.farEnd.y);
        return answer;
    };
    Ray.prototype.nearestIntersection = function () {
        var _this = this;
        if (this.intersectionPoints.length > 0) {
            return minBy(this.intersectionPoints, function (_a) {
                var pt = _a.pt, color = _a.color;
                return -_this.origin.dist(pt);
            });
        }
        else {
            return undefined;
        }
    };
    Ray.prototype.calculateIntersections = function (walls) {
        var res = [];
        for (var _i = 0, walls_1 = walls; _i < walls_1.length; _i++) {
            var wall = walls_1[_i];
            var intersection = this.intersectionWithWall(wall);
            if (intersection) {
                res.push({ pt: intersection, color: wall.myColor });
            }
        }
        return res;
    };
    Ray.prototype.recalculateIntersections = function (walls) {
        this.intersectionPoints = this.calculateIntersections(walls);
    };
    Ray.prototype.recalculateFarEnd = function () {
        this.farEnd = this.origin.copy().add(this.angleRads.copy().mult(width));
    };
    Ray.prototype.drawLitLineSegment = function (a, b) {
        stroke("white");
        line(a.x, a.y, b.x, b.y);
    };
    Ray.prototype.drawRayUntilFirstIntersection = function () {
        var o = this.origin;
        var end = o.copy().add(this.angleRads.copy().mult(40));
        if (renderingOptions.drawGhostRay) {
            stroke(255, 255, 255, 10);
            strokeWeight(0.3);
            line(o.x, o.y, this.farEnd.x, this.farEnd.y);
        }
        var _a = this.nearestIntersection(), pt = _a.pt, color = _a.color;
        if (renderingOptions.drawRayToFirstIntersection) {
            if (pt) {
                stroke(color);
                strokeWeight(2);
                this.drawLitLineSegment(o, pt);
            }
        }
        if (renderingOptions.drawAllIntersections) {
            for (var _i = 0, _b = this.intersectionPoints; _i < _b.length; _i++) {
                var _c = _b[_i], pt_1 = _c.pt, color_1 = _c.color;
                fill("white");
                circle(pt_1.x, pt_1.y, 2);
            }
        }
        if (renderingOptions.drawFirstIntersection) {
            var first = this.nearestIntersection();
            if (first) {
                noStroke();
                fill(first.color);
                circle(first.pt.x, first.pt.y, 6);
            }
        }
    };
    Ray.prototype.canSeePoint = function (target) {
        var nearestIsect = this.nearestIntersection();
        var distToTarget = this.origin.dist(target);
        return !(nearestIsect && this.origin.dist(nearestIsect.pt) < distToTarget);
    };
    return Ray;
}());
var Structure = (function () {
    function Structure(center, radius, numSides) {
        this.isFilledShape = false;
        this.shouldRotate = false;
        this.rotation = random(TWO_PI);
        this.myColor = Palette.randomColor();
        this.movementSpeed = -random(0.2, 2);
        this.rotationSpeed = random(-0.01, 0.01);
        this.abstractVertices = this.createVerticesForShapeWithNumSides(center, radius, numSides);
        this.walls = this.makeWallsFromVertices(this.abstractVertices, this.myColor);
    }
    Structure.prototype.createVerticesForShapeWithNumSides = function (center, radius, numSides) {
        var vertices = [];
        if (numSides === 1) {
            var _a = this.createRandomLineSeg(), a = _a[0], b = _a[1];
            vertices.push(a);
            vertices.push(b);
            this.center = a.copy().lerp(b, 0.5);
        }
        else {
            this.center = center.copy();
            for (var i = 0; i < numSides; i++) {
                var angle = (i * TWO_PI) / numSides;
                vertices.push(p5.Vector.fromAngle(angle)
                    .mult(radius)
                    .add(this.center));
            }
        }
        return vertices;
    };
    Structure.prototype.makeWallsFromVertices = function (vs, myColor) {
        var walls = [];
        if (vs.length === 2) {
            var singleWall = new Wall(vs[0], vs[1]);
            singleWall.myColor = myColor;
            walls.push(singleWall);
        }
        else {
            var numSides = vs.length;
            for (var i = 0; i < numSides; i++) {
                var a = vs[i];
                var b = i === numSides - 1 ? vs[0] : vs[i + 1];
                var wall = new Wall(a, b);
                wall.myColor = myColor;
                walls.push(wall);
            }
        }
        return walls;
    };
    Structure.prototype.createRandomLineSeg = function () {
        var p1 = randomScreenPosition();
        var p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
        return [p1, p2];
    };
    Structure.prototype.rotate = function (angleRad) {
        var _this = this;
        this.rotation += angleRad;
        var rotatedVertices = this.abstractVertices.map(function (v) {
            return rotateVertexAround(v, _this.center, _this.rotation);
        });
        this.walls = this.makeWallsFromVertices(rotatedVertices, this.myColor);
    };
    Structure.prototype.update = function () {
        var moveAmt = this.movementSpeed;
        if (this.center.x + moveAmt < 0) {
            moveAmt += width;
        }
        this.center.x += moveAmt;
        this.walls = this.makeWallsFromVertices(this.abstractVertices.map(function (v) { return v.add(createVector(moveAmt, 0)); }), this.myColor);
        if (this.shouldRotate) {
            this.rotate(this.rotationSpeed);
        }
    };
    Structure.prototype.draw = function () {
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            wall.draw();
        }
        if (this.isFilledShape) {
            beginShape();
            for (var _b = 0, _c = this.walls; _b < _c.length; _b++) {
                var wall = _c[_b];
                for (var _d = 0, _e = [wall.a, wall.b]; _d < _e.length; _d++) {
                    var pt = _e[_d];
                    vertex(pt.x, pt.y);
                }
            }
            endShape(CLOSE);
        }
    };
    Structure.createRandom = function () {
        var center = randomScreenPosition();
        var numSides = random([1, 1, 1, 3, 4, 5, 6]);
        return new Structure(center, random(20, random(100, 200)), numSides);
    };
    return Structure;
}());
function repeat(num, fn) {
    for (var i = 0; i < num; i++) {
        fn(i);
    }
}
function randomScreenPosition() {
    return createVector(random(width), random(height));
}
function randomInt(min, max) {
    return round(random(min, max));
}
function translateToVec(pos) {
    translate(pos.x, pos.y);
}
function centerPos() {
    return createVector(width / 2, height / 2);
}
function rotateVertexAround(vertex, rotOrigin, angleRad) {
    return vertex
        .copy()
        .sub(rotOrigin)
        .rotate(angleRad)
        .add(rotOrigin);
}
function collideLineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    var uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) /
        ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    var uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) /
        ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        var intersectionX = x1 + uA * (x2 - x1);
        var intersectionY = y1 + uA * (y2 - y1);
        return createVector(intersectionX, intersectionY);
    }
    return null;
}
function minBy(list, fn) {
    if (list.length < 0) {
        return null;
    }
    var recordItem = list[0];
    var recordWeight = fn(list[0]);
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var item = list_1[_i];
        var weight = fn(item);
        if (weight > recordWeight) {
            recordWeight = weight;
            recordItem = item;
        }
    }
    return recordItem;
}
function distributeUpTo(total, max, fn) {
    repeat(total, function (ix) {
        var val = (ix * max) / total;
        return fn(val);
    });
}
function collectDistributedBetween(numSamples, min, max, fn) {
    var result = [];
    distributeBetween(numSamples, min, max, function (v) { return result.push(fn(v)); });
    return result;
}
function distributeBetween(numSamples, min, max, fn) {
    repeat(numSamples, function (ix) {
        var range = max - min;
        var val = min + (ix * range) / numSamples;
        return fn(val);
    });
}
function averageVectors(vs) {
    if (vs.length < 1) {
        return createVector(0, 0);
    }
    return vs.reduce(function (v1, v2) { return v1.copy().add(v2); }, vs[0]).div(vs.length);
}
var gLastMouseMovements = [];
function angleOfLastMouseMovement() {
    var delta = createVector(mouseX - pmouseX, mouseY - pmouseY);
    if (delta.magSq() < 1) {
        return undefined;
    }
    else {
        gLastMouseMovements.unshift(delta);
        gLastMouseMovements.splice(8);
        var avgMovement = averageVectors(gLastMouseMovements);
        if (avgMovement.mag() > 0) {
            return avgMovement.heading();
        }
        else {
            return undefined;
        }
    }
}
function randomBoolean() {
    return Math.random() > 0.5;
}
function mousePosAsVector() {
    return createVector(mouseX, mouseY);
}
var Wall = (function () {
    function Wall(a, b) {
        this.a = a.copy();
        this.b = b.copy();
        this.myColor = color(243, 134, 48);
    }
    Wall.prototype.draw = function () {
        stroke(this.myColor);
        strokeWeight(4);
        line(this.a.x, this.a.y, this.b.x, this.b.y);
        noStroke();
        fill(this.myColor);
        [this.a, this.b].forEach(function (pt) {
        });
    };
    Wall.prototype.midPoint = function () {
        return this.a.copy().lerp(this.b, 0.5);
    };
    Wall.prototype.length = function () {
        return dist(this.a.x, this.a.y, this.b.x, this.b.y);
    };
    Wall.createRandom = function () {
        var p1 = randomScreenPosition();
        var p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
        return new Wall(p1, p2);
    };
    return Wall;
}());
p5.disableFriendlyErrors = true;
var gAgents = [];
var gPlayerRays = [];
var gPlayer = null;
var gNumAgents = 100;
var gNumPlayerRays = 200;
var gNumStructures = 10;
var appOptions = randomAppOptions();
var defaultAppOptions = {
    isMovingStructures: true,
    isRotatingStructures: true,
    isDrawingIn3D: false,
    isDrawStructures: true
};
function randomAppOptions() {
    return {
        isMovingStructures: randomBoolean(),
        isRotatingStructures: randomBoolean(),
        isDrawStructures: randomBoolean(),
        isDrawingIn3D: randomBoolean()
    };
}
var gStructures = [];
function setup() {
    createCanvas(windowWidth, windowHeight);
    repeat(gNumStructures, function () {
        var structure = Structure.createRandom();
        gStructures.push(structure);
    });
    repeat(gNumAgents, function () {
        gAgents.push(Agent.createRandom());
    });
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), 0, gNumPlayerRays);
    gPlayer = Particle.createRandom();
    mouseX = centerPos().x;
    mouseY = centerPos().y;
}
function makeScreenWalls() {
    var _a = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
    ].map(function (_a) {
        var x = _a[0], y = _a[1];
        return createVector(x, y);
    }), tl = _a[0], tr = _a[1], br = _a[2], bl = _a[3];
    return [[tl, tr], [tr, br], [bl, br], [tl, bl]].map(function (_a) {
        var pt1 = _a[0], pt2 = _a[1];
        var w = new Wall(pt1, pt2);
        w.myColor = color("darkgray");
        return w;
    });
}
function getAllWalls() {
    var wallsFromStructures = gStructures.flatMap(function (structure) { return structure.walls; });
    var screenWalls = makeScreenWalls();
    return screenWalls.concat(wallsFromStructures);
}
function createRaysAtPosition(numRays, pos, heading, fovRadians) {
    var halfFOV = fovRadians / 2;
    return collectDistributedBetween(numRays, heading - halfFOV, heading + halfFOV, function (val) { return new Ray(pos, { angleRads: val, walls: getAllWalls() }); });
}
function update() {
    gPlayer.setPosition(mousePosAsVector());
    gPlayer.update();
    for (var _i = 0, gStructures_1 = gStructures; _i < gStructures_1.length; _i++) {
        var s = gStructures_1[_i];
        if (appOptions.isMovingStructures) {
            s.shouldRotate = true;
            s.update();
        }
    }
    for (var _a = 0, gAgents_1 = gAgents; _a < gAgents_1.length; _a++) {
        var agent = gAgents_1[_a];
        agent.update(getAllWalls(), mousePosAsVector());
    }
    gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), gPlayer.heading, radians(60));
}
function draw() {
    update();
    background(0);
    appOptions.isDrawingIn3D ? drawFake3D() : drawTopDown();
    drawPlayerDebugInfo();
}
function drawPlayerDebugInfo() {
    push();
    translate(gPlayer.pos.x, gPlayer.pos.y);
    noFill();
    stroke("purple");
    var vec = p5.Vector.fromAngle(gPlayer.heading).mult(50);
    line(0, 0, vec.x, vec.y);
    circle(0, 0, 10);
    pop();
}
function drawFake3D() {
    background("gray");
    var buff = makeDistancesBuffer(gPlayerRays);
    drawDistancesBuffer(buff);
}
function drawTopDown() {
    fill("black");
    noStroke();
    if (appOptions.isDrawStructures) {
        for (var _i = 0, gStructures_2 = gStructures; _i < gStructures_2.length; _i++) {
            var s = gStructures_2[_i];
            s.draw();
        }
    }
    for (var _a = 0, _b = getAllWalls(); _a < _b.length; _a++) {
        var wall = _b[_a];
        wall.draw();
    }
    for (var _c = 0, gAgents_2 = gAgents; _c < gAgents_2.length; _c++) {
        var agent = gAgents_2[_c];
        agent.draw();
    }
    for (var _d = 0, gPlayerRays_1 = gPlayerRays; _d < gPlayerRays_1.length; _d++) {
        var ray = gPlayerRays_1[_d];
        ray.drawRayUntilFirstIntersection();
    }
    gPlayer.draw();
}
function toggle2D3D() {
    appOptions.isDrawingIn3D = !appOptions.isDrawingIn3D;
}
function toggleMovingStructures() {
    appOptions.isMovingStructures = !appOptions.isMovingStructures;
}
function toggleRotatingStructures() {
    appOptions.isRotatingStructures = !appOptions.isRotatingStructures;
}
function mousePressed() {
    toggleMovingStructures();
}
function keyPressed() {
    if (key == "3") {
        toggle2D3D();
    }
    if (key == "r") {
        toggleRotatingStructures();
    }
    if (key == "o") {
        randomiseRenderingOptions();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiLi9qcy8iLCJzb3VyY2VzIjpbImluZGV4LnRzIiwiQWdlbnQudHMiLCJGYWtlM0QudHMiLCJQYWxldHRlLnRzIiwiUGFydGljbGUudHMiLCJSYXkudHMiLCJTdHJ1Y3R1cmUudHMiLCJVdGlscy50cyIsIldhbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FDQWI7SUFLRSxlQUFZLEdBQWM7UUFDeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxvQkFBSSxHQUFKO1FBQ0UsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyQyxJQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRW5CLFFBQVEsRUFBRSxDQUFDO1FBQ1gsSUFBSSxFQUFFLENBQUM7UUFDUCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1QsSUFBSSxVQUFVLENBQUM7UUFDZixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osVUFBVSxHQUFHLEVBQUUsQ0FBQztZQUNoQixRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDYixJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFD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Q0QsU0FBUyxVQUFVO0lBQ2pCLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRTtRQUNkLFVBQVUsRUFBRSxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUU7UUFDZCx3QkFBd0IsRUFBRSxDQUFDO0tBQzVCO0lBQ0QsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFO1FBQ2QseUJBQXlCLEVBQUUsQ0FBQztLQUM3QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbnA1LmRpc2FibGVGcmllbmRseUVycm9ycyA9IHRydWU7XG5cbmxldCBnQWdlbnRzOiBBZ2VudFtdID0gW107XG5sZXQgZ1BsYXllclJheXM6IFJheVtdID0gW107XG5sZXQgZ1BsYXllcjogUGFydGljbGUgPSBudWxsO1xubGV0IGdOdW1BZ2VudHM6IG51bWJlciA9IDEwMDtcbmxldCBnTnVtUGxheWVyUmF5czogbnVtYmVyID0gMjAwO1xubGV0IGdOdW1TdHJ1Y3R1cmVzID0gMTA7XG5sZXQgYXBwT3B0aW9uczogQXBwT3B0aW9ucyA9IHJhbmRvbUFwcE9wdGlvbnMoKTtcblxuaW50ZXJmYWNlIEFwcE9wdGlvbnMge1xuICBpc01vdmluZ1N0cnVjdHVyZXM6IGJvb2xlYW47XG4gIGlzUm90YXRpbmdTdHJ1Y3R1cmVzOiBib29sZWFuO1xuICBpc0RyYXdpbmdJbjNEOiBib29sZWFuO1xuICBpc0RyYXdTdHJ1Y3R1cmVzOiBib29sZWFuO1xufVxubGV0IGRlZmF1bHRBcHBPcHRpb25zOiBBcHBPcHRpb25zID0ge1xuICBpc01vdmluZ1N0cnVjdHVyZXM6IHRydWUsXG4gIGlzUm90YXRpbmdTdHJ1Y3R1cmVzOiB0cnVlLFxuICBpc0RyYXdpbmdJbjNEOiBmYWxzZSxcbiAgaXNEcmF3U3RydWN0dXJlczogdHJ1ZVxufTtcblxuZnVuY3Rpb24gcmFuZG9tQXBwT3B0aW9ucygpOiBBcHBPcHRpb25zIHtcbiAgcmV0dXJuIHtcbiAgICBpc01vdmluZ1N0cnVjdHVyZXM6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBpc1JvdGF0aW5nU3RydWN0dXJlczogcmFuZG9tQm9vbGVhbigpLFxuICAgIGlzRHJhd1N0cnVjdHVyZXM6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBpc0RyYXdpbmdJbjNEOiByYW5kb21Cb29sZWFuKClcbiAgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBTRVRVUFxuICovXG5jb25zdCBnU3RydWN0dXJlczogU3RydWN0dXJlW10gPSBbXTtcbmZ1bmN0aW9uIHNldHVwKCkge1xuICBjcmVhdGVDYW52YXMod2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG5cbiAgcmVwZWF0KGdOdW1TdHJ1Y3R1cmVzLCAoKSA9PiB7XG4gICAgY29uc3Qgc3RydWN0dXJlID0gU3RydWN0dXJlLmNyZWF0ZVJhbmRvbSgpO1xuICAgIGdTdHJ1Y3R1cmVzLnB1c2goc3RydWN0dXJlKTtcbiAgfSk7XG5cbiAgcmVwZWF0KGdOdW1BZ2VudHMsICgpID0+IHtcbiAgICBnQWdlbnRzLnB1c2goQWdlbnQuY3JlYXRlUmFuZG9tKCkpO1xuICB9KTtcblxuICBnUGxheWVyUmF5cyA9IGNyZWF0ZVJheXNBdFBvc2l0aW9uKFxuICAgIGdOdW1QbGF5ZXJSYXlzLFxuICAgIG1vdXNlUG9zQXNWZWN0b3IoKSxcbiAgICAwLFxuICAgIGdOdW1QbGF5ZXJSYXlzXG4gICk7XG4gIGdQbGF5ZXIgPSBQYXJ0aWNsZS5jcmVhdGVSYW5kb20oKTtcbiAgbW91c2VYID0gY2VudGVyUG9zKCkueDtcbiAgbW91c2VZID0gY2VudGVyUG9zKCkueTtcbn1cblxuZnVuY3Rpb24gbWFrZVNjcmVlbldhbGxzKCk6IFdhbGxbXSB7XG4gIGNvbnN0IFt0bCwgdHIsIGJyLCBibF0gPSBbXG4gICAgWzAsIDBdLFxuICAgIFt3aWR0aCwgMF0sXG4gICAgW3dpZHRoLCBoZWlnaHRdLFxuICAgIFswLCBoZWlnaHRdXG4gIF0ubWFwKChbeCwgeV0pID0+IGNyZWF0ZVZlY3Rvcih4LCB5KSk7XG4gIHJldHVybiBbW3RsLCB0cl0sIFt0ciwgYnJdLCBbYmwsIGJyXSwgW3RsLCBibF1dLm1hcCgoW3B0MSwgcHQyXSkgPT4ge1xuICAgIGNvbnN0IHcgPSBuZXcgV2FsbChwdDEsIHB0Mik7XG4gICAgdy5teUNvbG9yID0gY29sb3IoXCJkYXJrZ3JheVwiKTtcbiAgICByZXR1cm4gdztcbiAgfSk7XG59XG5mdW5jdGlvbiBnZXRBbGxXYWxscygpOiBXYWxsW10ge1xuICBjb25zdCB3YWxsc0Zyb21TdHJ1Y3R1cmVzID0gZ1N0cnVjdHVyZXMuZmxhdE1hcChcbiAgICAoc3RydWN0dXJlOiBTdHJ1Y3R1cmUpID0+IHN0cnVjdHVyZS53YWxsc1xuICApO1xuICBjb25zdCBzY3JlZW5XYWxscyA9IG1ha2VTY3JlZW5XYWxscygpO1xuICByZXR1cm4gc2NyZWVuV2FsbHMuY29uY2F0KHdhbGxzRnJvbVN0cnVjdHVyZXMpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVSYXlzQXRQb3NpdGlvbihcbiAgbnVtUmF5czogbnVtYmVyLFxuICBwb3M6IHA1LlZlY3RvcixcbiAgaGVhZGluZzogbnVtYmVyLFxuICBmb3ZSYWRpYW5zOiBudW1iZXJcbikge1xuICBjb25zdCBoYWxmRk9WID0gZm92UmFkaWFucyAvIDI7XG4gIHJldHVybiBjb2xsZWN0RGlzdHJpYnV0ZWRCZXR3ZWVuKFxuICAgIG51bVJheXMsXG4gICAgaGVhZGluZyAtIGhhbGZGT1YsXG4gICAgaGVhZGluZyArIGhhbGZGT1YsXG4gICAgdmFsID0+IG5ldyBSYXkocG9zLCB7IGFuZ2xlUmFkczogdmFsLCB3YWxsczogZ2V0QWxsV2FsbHMoKSB9KVxuICApO1xufVxuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gIGdQbGF5ZXIuc2V0UG9zaXRpb24obW91c2VQb3NBc1ZlY3RvcigpKTtcbiAgZ1BsYXllci51cGRhdGUoKTtcblxuICBmb3IgKGxldCBzIG9mIGdTdHJ1Y3R1cmVzKSB7XG4gICAgaWYgKGFwcE9wdGlvbnMuaXNNb3ZpbmdTdHJ1Y3R1cmVzKSB7XG4gICAgICBzLnNob3VsZFJvdGF0ZSA9IHRydWU7XG4gICAgICBzLnVwZGF0ZSgpO1xuICAgIH1cbiAgfVxuICBmb3IgKGxldCBhZ2VudCBvZiBnQWdlbnRzKSB7XG4gICAgYWdlbnQudXBkYXRlKGdldEFsbFdhbGxzKCksIG1vdXNlUG9zQXNWZWN0b3IoKSk7XG4gIH1cblxuICBnUGxheWVyUmF5cyA9IGNyZWF0ZVJheXNBdFBvc2l0aW9uKFxuICAgIGdOdW1QbGF5ZXJSYXlzLFxuICAgIG1vdXNlUG9zQXNWZWN0b3IoKSxcbiAgICBnUGxheWVyLmhlYWRpbmcsXG4gICAgcmFkaWFucyg2MClcbiAgKTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBEUkFXXG4gKi9cbmZ1bmN0aW9uIGRyYXcoKSB7XG4gIHVwZGF0ZSgpO1xuICBiYWNrZ3JvdW5kKDApO1xuICBhcHBPcHRpb25zLmlzRHJhd2luZ0luM0QgPyBkcmF3RmFrZTNEKCkgOiBkcmF3VG9wRG93bigpO1xuICBkcmF3UGxheWVyRGVidWdJbmZvKCk7XG59XG5cbmZ1bmN0aW9uIGRyYXdQbGF5ZXJEZWJ1Z0luZm8oKSB7XG4gIHB1c2goKTtcbiAgdHJhbnNsYXRlKGdQbGF5ZXIucG9zLngsIGdQbGF5ZXIucG9zLnkpO1xuICBub0ZpbGwoKTtcbiAgc3Ryb2tlKFwicHVycGxlXCIpO1xuICBjb25zdCB2ZWMgPSBwNS5WZWN0b3IuZnJvbUFuZ2xlKGdQbGF5ZXIuaGVhZGluZykubXVsdCg1MCk7XG4gIGxpbmUoMCwgMCwgdmVjLngsIHZlYy55KTtcbiAgY2lyY2xlKDAsIDAsIDEwKTtcbiAgcG9wKCk7XG59XG5cbmZ1bmN0aW9uIGRyYXdGYWtlM0QoKSB7XG4gIGJhY2tncm91bmQoXCJncmF5XCIpO1xuICBjb25zdCBidWZmID0gbWFrZURpc3RhbmNlc0J1ZmZlcihnUGxheWVyUmF5cyk7XG4gIGRyYXdEaXN0YW5jZXNCdWZmZXIoYnVmZik7XG59XG5cbmZ1bmN0aW9uIGRyYXdUb3BEb3duKCkge1xuICBmaWxsKFwiYmxhY2tcIik7XG4gIG5vU3Ryb2tlKCk7XG4gIGlmIChhcHBPcHRpb25zLmlzRHJhd1N0cnVjdHVyZXMpIHtcbiAgICBmb3IgKGxldCBzIG9mIGdTdHJ1Y3R1cmVzKSB7XG4gICAgICBzLmRyYXcoKTtcbiAgICB9XG4gIH1cbiAgZm9yIChsZXQgd2FsbCBvZiBnZXRBbGxXYWxscygpKSB7XG4gICAgd2FsbC5kcmF3KCk7XG4gIH1cblxuICBmb3IgKGxldCBhZ2VudCBvZiBnQWdlbnRzKSB7XG4gICAgYWdlbnQuZHJhdygpO1xuICB9XG4gIGZvciAobGV0IHJheSBvZiBnUGxheWVyUmF5cykge1xuICAgIHJheS5kcmF3UmF5VW50aWxGaXJzdEludGVyc2VjdGlvbigpO1xuICB9XG4gIGdQbGF5ZXIuZHJhdygpO1xufVxuZnVuY3Rpb24gdG9nZ2xlMkQzRCgpIHtcbiAgYXBwT3B0aW9ucy5pc0RyYXdpbmdJbjNEID0gIWFwcE9wdGlvbnMuaXNEcmF3aW5nSW4zRDtcbn1cbmZ1bmN0aW9uIHRvZ2dsZU1vdmluZ1N0cnVjdHVyZXMoKSB7XG4gIGFwcE9wdGlvbnMuaXNNb3ZpbmdTdHJ1Y3R1cmVzID0gIWFwcE9wdGlvbnMuaXNNb3ZpbmdTdHJ1Y3R1cmVzO1xufVxuZnVuY3Rpb24gdG9nZ2xlUm90YXRpbmdTdHJ1Y3R1cmVzKCkge1xuICBhcHBPcHRpb25zLmlzUm90YXRpbmdTdHJ1Y3R1cmVzID0gIWFwcE9wdGlvbnMuaXNSb3RhdGluZ1N0cnVjdHVyZXM7XG59XG5mdW5jdGlvbiBtb3VzZVByZXNzZWQoKSB7XG4gIHRvZ2dsZU1vdmluZ1N0cnVjdHVyZXMoKTtcbn1cbmZ1bmN0aW9uIGtleVByZXNzZWQoKSB7XG4gIGlmIChrZXkgPT0gXCIzXCIpIHtcbiAgICB0b2dnbGUyRDNEKCk7XG4gIH1cbiAgaWYgKGtleSA9PSBcInJcIikge1xuICAgIHRvZ2dsZVJvdGF0aW5nU3RydWN0dXJlcygpO1xuICB9XG4gIGlmIChrZXkgPT0gXCJvXCIpIHtcbiAgICByYW5kb21pc2VSZW5kZXJpbmdPcHRpb25zKCk7XG4gIH1cbn1cbiIsImNsYXNzIEFnZW50IHtcbiAgcG9zOiBwNS5WZWN0b3I7XG4gIG1vdmVtZW50UGhhc2U6IG51bWJlcjtcbiAgcmF5OiBSYXk7XG5cbiAgY29uc3RydWN0b3IocG9zOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLnBvcyA9IHBvcy5jb3B5KCk7XG4gICAgdGhpcy5tb3ZlbWVudFBoYXNlID0gcmFuZG9tKDEwMDAwKTtcbiAgICB0aGlzLnJheSA9IG5ldyBSYXkodGhpcy5wb3MsIHsgdGFyZ2V0OiBtb3VzZVBvc0FzVmVjdG9yKCkgfSk7XG4gIH1cblxuICBkcmF3KCkge1xuICAgIGNvbnN0IHRhcmdldFBvcyA9IG1vdXNlUG9zQXNWZWN0b3IoKTtcbiAgICBjb25zdCBvID0gdGhpcy5wb3M7XG4gICAgLy9kcmF3IGFnZW50IHNwcml0ZSAoYSBjaXJjbGUpIGFjY29yZGluZyB0byB3aGV0aGVyIGl0IGhhcyBsLm8ucy4gdG8gdGFyZ2V0UG9zXG4gICAgbm9TdHJva2UoKTtcbiAgICBwdXNoKCk7XG4gICAgdHJhbnNsYXRlKG8ueCwgby55KTtcbiAgICBzY2FsZSgyKTtcbiAgICBsZXQgYnJpZ2h0bmVzcztcbiAgICBjb25zdCB2aXNpYmxlID0gdGhpcy5yYXkuY2FuU2VlUG9pbnQodGFyZ2V0UG9zKTtcbiAgICBpZiAoIXZpc2libGUpIHtcbiAgICAgIGJyaWdodG5lc3MgPSAyMDtcbiAgICAgIHRleHRTaXplKDI0KTtcbiAgICAgIGZpbGwoMTAwLCAxMDAsIDEwMCwgMzApO1xuICAgICAgdGV4dChcIj9cIiwgLTYsIDgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkaXN0VG9UYXJnZXQgPSB0aGlzLnBvcy5kaXN0KHRhcmdldFBvcyk7XG4gICAgICBicmlnaHRuZXNzID0gbWFwKGRpc3RUb1RhcmdldCwgMCwgbWF4KHdpZHRoLCBoZWlnaHQpLCAyNTUsIDApO1xuICAgICAgY29sb3JNb2RlKFJHQik7XG4gICAgICBjb25zdCBsaXRDb2xvcjogcDUuQ29sb3IgPSBjb2xvcigyMjQsIDIyOCwgMjA0LCBicmlnaHRuZXNzKTtcbiAgICAgIGZpbGwobGl0Q29sb3IpO1xuICAgICAgY2lyY2xlKDAsIDAsIDgpO1xuICAgICAgZmlsbCgwLCAwLCAwLCA0MCk7XG4gICAgICByZWN0TW9kZShDRU5URVIpO1xuICAgICAgcmVjdCgwLCAzLCA1LCAyKTtcbiAgICAgIC8vZXllc1xuICAgICAgY2lyY2xlKC0yLCAtMSwgMSk7XG4gICAgICBjaXJjbGUoMiwgLTEsIDEpO1xuICAgIH1cbiAgICBwb3AoKTtcbiAgfVxuXG4gIHNldFBvc2l0aW9uKHBvczogcDUuVmVjdG9yKSB7XG4gICAgdGhpcy5wb3MueCA9IHBvcy54O1xuICAgIHRoaXMucG9zLnkgPSBwb3MueTtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSYW5kb20oKSB7XG4gICAgcmV0dXJuIG5ldyBBZ2VudChyYW5kb21TY3JlZW5Qb3NpdGlvbigpKTtcbiAgfVxuICAvKiogbW92ZSB0aGUgYWdlbnQgYW5kIHJlY2FsY3VsYXRlIHRoZSByYXkgZnJvbSBpdCB0byB0aGUgdGFyZ2V0IHBvcyAqL1xuICB1cGRhdGUod2FsbHM6IFdhbGxbXSwgdGFyZ2V0UG9zOiBwNS5WZWN0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBvZmZzZXQgPSBjcmVhdGVWZWN0b3IoMCwgMCk7XG4gICAgb2Zmc2V0LnggPSBtYXAoXG4gICAgICBub2lzZSh0aGlzLm1vdmVtZW50UGhhc2UgKyAzMzMzMyArIGZyYW1lQ291bnQgLyAxMDApLFxuICAgICAgMCxcbiAgICAgIDEsXG4gICAgICAtMSxcbiAgICAgIDFcbiAgICApO1xuICAgIG9mZnNldC55ID0gbWFwKG5vaXNlKHRoaXMubW92ZW1lbnRQaGFzZSArIGZyYW1lQ291bnQgLyAxMDApLCAwLCAxLCAtMSwgMSk7XG5cbiAgICB0aGlzLnNldFBvc2l0aW9uKHRoaXMucG9zLmNvcHkoKS5hZGQob2Zmc2V0KSk7XG5cbiAgICB0aGlzLnJheSA9IG5ldyBSYXkodGhpcy5wb3MsIHsgdGFyZ2V0OiB0YXJnZXRQb3MsIHdhbGxzOiB3YWxscyB9KTtcbiAgfVxufVxuIiwiLy9UT0RPOiBuYW1lc3BhY2UgdGhpc1xuXG5pbnRlcmZhY2UgRGlzdGFudFBvaW50IHtcbiAgZGlzdGFuY2U6IG51bWJlcjtcbiAgLy9UT0RPOiB0aGlzIGNvdWxkIGp1c3QgYmUgYSBjb2xsZWN0aW9uIG9mIGRhdGEgYWJvdXQgdGhlIG9iamVjdCBpdCBoaXQgKG9iamVjdCBpZCwgY29sb3IsIHN1cmZhY2Ugbm9ybWFsLCBpbGx1bWluYXRpb24sIHRleHR1cmUsIGhlaWdodClcbiAgY29sb3I6IHA1LkNvbG9yO1xufVxuXG5pbnRlcmZhY2UgRGlzdGFuY2VzQnVmZmVyIHtcbiAgdmFsdWVzOiBEaXN0YW50UG9pbnRbXTtcbn1cblxuZnVuY3Rpb24gbWFrZURpc3RhbmNlc0J1ZmZlcihyYXlzOiBSYXlbXSk6IERpc3RhbmNlc0J1ZmZlciB7XG4gIHJldHVybiBnZW5lcmF0ZURhdGFGcm9tUmF5cyhyYXlzKTtcbn1cblxuZnVuY3Rpb24gY29sb3JGb3JQb2ludChcbiAgeyBjb2xvcjogYywgcHQgfTogSW50ZXJzZWN0aW9uUG9pbnQsXG4gIG9yaWdpbjogcDUuVmVjdG9yXG4pOiBwNS5Db2xvciB7XG4gIGNvbnN0IGRpc3QgPSBvcmlnaW4uZGlzdChwdCk7XG4gIGNvbnN0IGxpZ2h0bmVzcyA9IG1hcChkaXN0LCAwLCB3aWR0aCwgNTAsIDMpO1xuICBjb2xvck1vZGUoUkdCKTtcbiAgY29uc3QgW2gsIHNdID0gW2h1ZShjKSwgc2F0dXJhdGlvbihjKV07XG4gIGNvbG9yTW9kZShIU0wsIDEwMCk7XG4gIHJldHVybiBjb2xvcihoLCBzLCBsaWdodG5lc3MpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZURhdGFGcm9tUmF5cyhyYXlzOiBSYXlbXSk6IERpc3RhbmNlc0J1ZmZlciB7XG4gIHJldHVybiB7XG4gICAgdmFsdWVzOiByYXlzLm1hcChyYXkgPT4ge1xuICAgICAgY29uc3QgbmVhcmVzdCA9IHJheS5uZWFyZXN0SW50ZXJzZWN0aW9uKCk7XG4gICAgICByZXR1cm4gbmVhcmVzdFxuICAgICAgICA/IHtcbiAgICAgICAgICAgIGRpc3RhbmNlOiBuZWFyZXN0LnB0LmRpc3QocmF5Lm9yaWdpbiksXG4gICAgICAgICAgICBjb2xvcjogY29sb3JGb3JQb2ludChuZWFyZXN0LCByYXkub3JpZ2luKVxuICAgICAgICAgIH1cbiAgICAgICAgOiB7IGRpc3RhbmNlOiB3aWR0aCAqIDEuNSwgY29sb3I6IGNvbG9yKFwiYmxhY2tcIikgfTtcbiAgICB9KVxuICB9O1xufVxuXG5mdW5jdGlvbiBkcmF3RGlzdGFuY2VzQnVmZmVyKGRpc3RhbnRQb2ludHM6IERpc3RhbmNlc0J1ZmZlcikge1xuICBjb25zdCBudW1TdHJpcHMgPSBkaXN0YW50UG9pbnRzLnZhbHVlcy5sZW5ndGg7XG4gIGNvbnN0IHN0cmlwU3BhY2luZyA9IHdpZHRoIC8gbnVtU3RyaXBzO1xuICBjb25zdCBzdHJpcFdpZHRoID0gY2VpbChzdHJpcFNwYWNpbmcpO1xuXG4gIGRpc3RhbnRQb2ludHMudmFsdWVzLmZvckVhY2goKHsgZGlzdGFuY2UsIGNvbG9yIH0sIGl4KSA9PiB7XG4gICAgY29uc3QgeCA9IGl4ICogc3RyaXBXaWR0aDtcbiAgICBjb25zdCBkaXN0U3EgPSBkaXN0YW5jZSBeIDI7XG4gICAgY29uc3QgbWF4SGVpZ2h0ID0gaGVpZ2h0ICogMC43O1xuICAgIGNvbnN0IG1heEhlaWdodFNxID0gbWF4SGVpZ2h0IF4gMjtcbiAgICBjb25zdCB5ID0gbWFwKGRpc3RTcSwgMCwgd2lkdGgsIG1heEhlaWdodFNxLCAwKTtcblxuICAgIG5vU3Ryb2tlKCk7XG4gICAgZmlsbChjb2xvcik7XG4gICAgcmVjdE1vZGUoQ0VOVEVSKTtcbiAgICByZWN0KHgsIGhlaWdodCAvIDIsIHN0cmlwV2lkdGgsIHkpO1xuICB9KTtcbn1cbiIsImNsYXNzIFBhbGV0dGUge1xuICBzdGF0aWMgZ2V0Q29sb3JzKCkge1xuICAgIHJldHVybiBbXG4gICAgICBjb2xvcigyNTAsIDEwNSwgMCksXG4gICAgICBjb2xvcigxMDUsIDIxMCwgMjMxKSxcbiAgICAgIGNvbG9yKDE2NywgMjE5LCAyMTYpLFxuICAgICAgY29sb3IoMjQzLCAxMzQsIDQ4KVxuICAgIF07XG4gIH1cbiAgc3RhdGljIHJhbmRvbUNvbG9yKCk6IHA1LkNvbG9yIHtcbiAgICByZXR1cm4gcmFuZG9tKFBhbGV0dGUuZ2V0Q29sb3JzKCkpO1xuICB9XG59XG4iLCJjbGFzcyBQYXJ0aWNsZSB7XG4gIHBvczogcDUuVmVjdG9yO1xuICBoZWFkaW5nOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocG9zOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLnBvcyA9IHBvcy5jb3B5KCk7XG4gICAgdGhpcy5oZWFkaW5nID0gMDtcbiAgfVxuICBkcmF3KCkge1xuICAgIG5vU3Ryb2tlKCk7XG4gICAgZmlsbChcImJsYWNrXCIpO1xuICAgIHJlY3RNb2RlKENFTlRFUik7XG4gICAgc3F1YXJlKHRoaXMucG9zLngsIHRoaXMucG9zLnksIDMpO1xuICAgIGZpbGwoMCwgMjApO1xuICB9XG4gIHVwZGF0ZSgpIHtcbiAgICBjb25zdCBtb3VzZU1vdmVtZW50QW5nbGUgPSBhbmdsZU9mTGFzdE1vdXNlTW92ZW1lbnQoKTtcbiAgICBpZiAobW91c2VNb3ZlbWVudEFuZ2xlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuaGVhZGluZyA9IG1vdXNlTW92ZW1lbnRBbmdsZTtcbiAgICB9XG4gIH1cblxuICBzZXRQb3NpdGlvbihwb3M6IHA1LlZlY3Rvcikge1xuICAgIHRoaXMucG9zLnggPSBwb3MueDtcbiAgICB0aGlzLnBvcy55ID0gcG9zLnk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmFuZG9tKCkge1xuICAgIHJldHVybiBuZXcgUGFydGljbGUocmFuZG9tU2NyZWVuUG9zaXRpb24oKSk7XG4gIH1cbn1cbiIsImludGVyZmFjZSBSZW5kZXJpbmdPcHRpb25zIHtcbiAgZHJhd0dob3N0UmF5OiBib29sZWFuO1xuICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogYm9vbGVhbjtcbiAgZHJhd0FsbEludGVyc2VjdGlvbnM6IGJvb2xlYW47XG4gIGRyYXdGaXJzdEludGVyc2VjdGlvbjogYm9vbGVhbjtcbn1cbmNvbnN0IGRlZmF1bHRSZW5kZXJpbmdPcHRpb25zOiBSZW5kZXJpbmdPcHRpb25zID0ge1xuICBkcmF3R2hvc3RSYXk6IGZhbHNlLFxuICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogdHJ1ZSxcbiAgZHJhd0FsbEludGVyc2VjdGlvbnM6IGZhbHNlLFxuICBkcmF3Rmlyc3RJbnRlcnNlY3Rpb246IHRydWVcbn07XG5sZXQgcmVuZGVyaW5nT3B0aW9uczogUmVuZGVyaW5nT3B0aW9ucyA9IHJhbmRvbVJlbmRlcmluZ09wdGlvbnMoKTtcblxuZnVuY3Rpb24gcmFuZG9taXNlUmVuZGVyaW5nT3B0aW9ucygpIHtcbiAgcmVuZGVyaW5nT3B0aW9ucyA9IHJhbmRvbVJlbmRlcmluZ09wdGlvbnMoKTtcbn1cblxuZnVuY3Rpb24gcmFuZG9tUmVuZGVyaW5nT3B0aW9ucygpIHtcbiAgcmV0dXJuIHtcbiAgICBkcmF3R2hvc3RSYXk6IHJhbmRvbUJvb2xlYW4oKSxcbiAgICBkcmF3UmF5VG9GaXJzdEludGVyc2VjdGlvbjogcmFuZG9tQm9vbGVhbigpLFxuICAgIGRyYXdBbGxJbnRlcnNlY3Rpb25zOiByYW5kb21Cb29sZWFuKCksXG4gICAgZHJhd0ZpcnN0SW50ZXJzZWN0aW9uOiByYW5kb21Cb29sZWFuKClcbiAgfTtcbn1cbmludGVyZmFjZSBJbnRlcnNlY3Rpb25Qb2ludCB7XG4gIHB0OiBwNS5WZWN0b3I7XG4gIGNvbG9yOiBwNS5Db2xvcjtcbn1cblxuaW50ZXJmYWNlIFJheU9wdGlvbnMge1xuICBhbmdsZVJhZHM/OiBudW1iZXI7XG4gIHRhcmdldD86IHA1LlZlY3RvcjsgLy9UT0RPOiBleGFjdGx5IG9uZSBvZiB0YXJnZXQgYW5kIGFuZ2xlUmFkcyBpcyByZXF1aXJlZC5cbiAgd2FsbHM/OiBXYWxsW107XG59XG5cbmNsYXNzIFJheSB7XG4gIC8vVE9ETzogc3BsaXQgdGhpcyBvdXQgaW50byBhbiBhZ2VudCB3aGljaCBoYXMgYW4gb3JpZ2luIGFuZCBhIHJheSwgd2l0aCB0aGUgcmF5IGhhbmRsaW5nIG9ubHkgaGFuZGxpbmcgZGVjaWRpbmcgbGluZSBvZiBzaWdodCBhbmQgaW50ZXJzZWN0aW9uIHBvaW50cy5cblxuICBvcmlnaW46IHA1LlZlY3RvcjtcblxuICAvL3JheSBpcyBjb25jZXB0dWFsbHkgaW5maW5pdGUgbGVuZ3RoIHdpdGggb25seSBvbmUgZW5kLCBidXQgdGhpcyBoYWNrIGlzIHVzZWZ1bCBmb3IgaW50ZXJzZWN0aW9uIGFuZCByZW5kZXJpbmcuXG4gIGZhckVuZDogcDUuVmVjdG9yOyAvL2EgaGFjay4gIG9mZnNjcmVlbiBcImZhciBlbmRcIi5cblxuICBhbmdsZVJhZHM6IHA1LlZlY3RvcjtcbiAgaW50ZXJzZWN0aW9uUG9pbnRzOiBJbnRlcnNlY3Rpb25Qb2ludFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIG9yaWdpbjogcDUuVmVjdG9yLFxuICAgIHsgYW5nbGVSYWRzID0gbnVsbCwgdGFyZ2V0ID0gbnVsbCwgd2FsbHMgPSBbXSB9OiBSYXlPcHRpb25zXG4gICkge1xuICAgIHRoaXMub3JpZ2luID0gb3JpZ2luLmNvcHkoKTtcbiAgICBpZiAodGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmxvb2tBdCh0YXJnZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFuZ2xlUmFkcyA9IHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGVSYWRzKTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMgPSBbXTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlRmFyRW5kKCk7XG4gICAgaWYgKHdhbGxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucmVjYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzKTtcbiAgICB9XG4gIH1cblxuICBsb29rQXQodGFyZ2V0UG9zOiBwNS5WZWN0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBkZWx0YVRvVGFyZ2V0ID0gdGFyZ2V0UG9zLmNvcHkoKS5zdWIodGhpcy5vcmlnaW4pO1xuICAgIC8vbm90ZTogcGFyYW0gb3JkZXI6IHkgdGhlbiB4XG4gICAgY29uc3QgYW5nbGVUb1RhcmdldCA9IGF0YW4yKGRlbHRhVG9UYXJnZXQueSwgZGVsdGFUb1RhcmdldC54KTtcbiAgICB0aGlzLmFuZ2xlUmFkcyA9IHA1LlZlY3Rvci5mcm9tQW5nbGUoYW5nbGVUb1RhcmdldCk7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUZhckVuZCgpO1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpOiBSYXkge1xuICAgIHJldHVybiBuZXcgUmF5KHJhbmRvbVNjcmVlblBvc2l0aW9uKCksIHsgYW5nbGVSYWRzOiByYW5kb20oMCwgVFdPX1BJKSB9KTtcbiAgfVxuICBpbnRlcnNlY3Rpb25XaXRoV2FsbCh3YWxsOiBXYWxsKTogcDUuVmVjdG9yIHtcbiAgICAvL1RPRE86IGN1c3RvbWlzZSBhIGZuIHRvIGNvbGxpZGVMaW5lU2VnV2l0aFJheSxcbiAgICAvL3JhdGhlciB0aGFuIExpbmVTZWcgd2l0aCBMaW5lU2VnXG4gICAgY29uc3QgYW5zd2VyID0gY29sbGlkZUxpbmVMaW5lKFxuICAgICAgd2FsbC5hLngsXG4gICAgICB3YWxsLmEueSxcbiAgICAgIHdhbGwuYi54LFxuICAgICAgd2FsbC5iLnksXG4gICAgICB0aGlzLm9yaWdpbi54LFxuICAgICAgdGhpcy5vcmlnaW4ueSxcbiAgICAgIHRoaXMuZmFyRW5kLngsXG4gICAgICB0aGlzLmZhckVuZC55XG4gICAgKTtcblxuICAgIHJldHVybiBhbnN3ZXI7XG4gIH1cblxuICBuZWFyZXN0SW50ZXJzZWN0aW9uKCk6IEludGVyc2VjdGlvblBvaW50IHtcbiAgICBpZiAodGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG1pbkJ5KFxuICAgICAgICB0aGlzLmludGVyc2VjdGlvblBvaW50cyxcbiAgICAgICAgKHsgcHQsIGNvbG9yIH06IEludGVyc2VjdGlvblBvaW50KSA9PiAtdGhpcy5vcmlnaW4uZGlzdChwdClcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIGNhbGN1bGF0ZUludGVyc2VjdGlvbnMod2FsbHM6IFdhbGxbXSk6IEludGVyc2VjdGlvblBvaW50W10ge1xuICAgIGNvbnN0IHJlczogSW50ZXJzZWN0aW9uUG9pbnRbXSA9IFtdO1xuICAgIGZvciAobGV0IHdhbGwgb2Ygd2FsbHMpIHtcbiAgICAgIGNvbnN0IGludGVyc2VjdGlvbiA9IHRoaXMuaW50ZXJzZWN0aW9uV2l0aFdhbGwod2FsbCk7XG4gICAgICBpZiAoaW50ZXJzZWN0aW9uKSB7XG4gICAgICAgIHJlcy5wdXNoKHsgcHQ6IGludGVyc2VjdGlvbiwgY29sb3I6IHdhbGwubXlDb2xvciB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICByZWNhbGN1bGF0ZUludGVyc2VjdGlvbnMod2FsbHM6IFdhbGxbXSk6IHZvaWQge1xuICAgIHRoaXMuaW50ZXJzZWN0aW9uUG9pbnRzID0gdGhpcy5jYWxjdWxhdGVJbnRlcnNlY3Rpb25zKHdhbGxzKTtcbiAgfVxuXG4gIHJlY2FsY3VsYXRlRmFyRW5kKCk6IHZvaWQge1xuICAgIHRoaXMuZmFyRW5kID0gdGhpcy5vcmlnaW4uY29weSgpLmFkZCh0aGlzLmFuZ2xlUmFkcy5jb3B5KCkubXVsdCh3aWR0aCkpO1xuICB9XG5cbiAgZHJhd0xpdExpbmVTZWdtZW50KGE6IHA1LlZlY3RvciwgYjogcDUuVmVjdG9yKTogdm9pZCB7XG4gICAgc3Ryb2tlKFwid2hpdGVcIik7XG4gICAgbGluZShhLngsIGEueSwgYi54LCBiLnkpO1xuICB9XG5cbiAgZHJhd1JheVVudGlsRmlyc3RJbnRlcnNlY3Rpb24oKTogdm9pZCB7XG4gICAgY29uc3QgbyA9IHRoaXMub3JpZ2luO1xuICAgIGNvbnN0IGVuZCA9IG8uY29weSgpLmFkZCh0aGlzLmFuZ2xlUmFkcy5jb3B5KCkubXVsdCg0MCkpO1xuXG4gICAgLy9kcmF3IHRvIGZhciAob2ZmLXNjcmVlbikgZW5kXG4gICAgaWYgKHJlbmRlcmluZ09wdGlvbnMuZHJhd0dob3N0UmF5KSB7XG4gICAgICBzdHJva2UoMjU1LCAyNTUsIDI1NSwgMTApO1xuICAgICAgc3Ryb2tlV2VpZ2h0KDAuMyk7XG4gICAgICBsaW5lKG8ueCwgby55LCB0aGlzLmZhckVuZC54LCB0aGlzLmZhckVuZC55KTtcbiAgICB9XG4gICAgY29uc3QgeyBwdCwgY29sb3IgfSA9IHRoaXMubmVhcmVzdEludGVyc2VjdGlvbigpO1xuICAgIGlmIChyZW5kZXJpbmdPcHRpb25zLmRyYXdSYXlUb0ZpcnN0SW50ZXJzZWN0aW9uKSB7XG4gICAgICBpZiAocHQpIHtcbiAgICAgICAgc3Ryb2tlKGNvbG9yKTtcbiAgICAgICAgc3Ryb2tlV2VpZ2h0KDIpO1xuICAgICAgICB0aGlzLmRyYXdMaXRMaW5lU2VnbWVudChvLCBwdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlcmluZ09wdGlvbnMuZHJhd0FsbEludGVyc2VjdGlvbnMpIHtcbiAgICAgIGZvciAobGV0IHsgcHQsIGNvbG9yIH0gb2YgdGhpcy5pbnRlcnNlY3Rpb25Qb2ludHMpIHtcbiAgICAgICAgZmlsbChcIndoaXRlXCIpO1xuICAgICAgICBjaXJjbGUocHQueCwgcHQueSwgMik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlcmluZ09wdGlvbnMuZHJhd0ZpcnN0SW50ZXJzZWN0aW9uKSB7XG4gICAgICBjb25zdCBmaXJzdCA9IHRoaXMubmVhcmVzdEludGVyc2VjdGlvbigpO1xuICAgICAgaWYgKGZpcnN0KSB7XG4gICAgICAgIG5vU3Ryb2tlKCk7XG4gICAgICAgIGZpbGwoZmlyc3QuY29sb3IpO1xuICAgICAgICBjaXJjbGUoZmlyc3QucHQueCwgZmlyc3QucHQueSwgNik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNhblNlZVBvaW50KHRhcmdldDogcDUuVmVjdG9yKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbmVhcmVzdElzZWN0OiBJbnRlcnNlY3Rpb25Qb2ludCA9IHRoaXMubmVhcmVzdEludGVyc2VjdGlvbigpO1xuICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IHRoaXMub3JpZ2luLmRpc3QodGFyZ2V0KTtcbiAgICByZXR1cm4gIShuZWFyZXN0SXNlY3QgJiYgdGhpcy5vcmlnaW4uZGlzdChuZWFyZXN0SXNlY3QucHQpIDwgZGlzdFRvVGFyZ2V0KTtcbiAgfVxufVxuIiwiY2xhc3MgU3RydWN0dXJlIHtcbiAgaXNGaWxsZWRTaGFwZSA9IGZhbHNlO1xuICBjZW50ZXI6IHA1LlZlY3RvcjtcbiAgYWJzdHJhY3RWZXJ0aWNlczogcDUuVmVjdG9yW107XG4gIHdhbGxzOiBXYWxsW107XG4gIG1vdmVtZW50U3BlZWQ6IG51bWJlcjtcbiAgbXlDb2xvcjogcDUuQ29sb3I7XG4gIHJvdGF0aW9uOiBudW1iZXI7XG4gIHJvdGF0aW9uU3BlZWQ6IG51bWJlcjtcbiAgc2hvdWxkUm90YXRlOiBib29sZWFuO1xuICBjb25zdHJ1Y3RvcihjZW50ZXI6IHA1LlZlY3RvciwgcmFkaXVzOiBudW1iZXIsIG51bVNpZGVzOiBudW1iZXIpIHtcbiAgICB0aGlzLnNob3VsZFJvdGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMucm90YXRpb24gPSByYW5kb20oVFdPX1BJKTtcbiAgICB0aGlzLm15Q29sb3IgPSBQYWxldHRlLnJhbmRvbUNvbG9yKCk7XG4gICAgdGhpcy5tb3ZlbWVudFNwZWVkID0gLXJhbmRvbSgwLjIsIDIpO1xuICAgIHRoaXMucm90YXRpb25TcGVlZCA9IHJhbmRvbSgtMC4wMSwgMC4wMSk7XG4gICAgdGhpcy5hYnN0cmFjdFZlcnRpY2VzID0gdGhpcy5jcmVhdGVWZXJ0aWNlc0ZvclNoYXBlV2l0aE51bVNpZGVzKFxuICAgICAgY2VudGVyLFxuICAgICAgcmFkaXVzLFxuICAgICAgbnVtU2lkZXNcbiAgICApO1xuXG4gICAgdGhpcy53YWxscyA9IHRoaXMubWFrZVdhbGxzRnJvbVZlcnRpY2VzKFxuICAgICAgdGhpcy5hYnN0cmFjdFZlcnRpY2VzLFxuICAgICAgdGhpcy5teUNvbG9yXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZVZlcnRpY2VzRm9yU2hhcGVXaXRoTnVtU2lkZXMoXG4gICAgY2VudGVyOiBwNS5WZWN0b3IsXG4gICAgcmFkaXVzOiBudW1iZXIsXG4gICAgbnVtU2lkZXM6IG51bWJlclxuICApOiBwNS5WZWN0b3JbXSB7XG4gICAgY29uc3QgdmVydGljZXMgPSBbXTtcbiAgICAvL3NwZWNpYWwgY2FzZSBmb3Igc2luZ2xlIHdhbGxcbiAgICBpZiAobnVtU2lkZXMgPT09IDEpIHtcbiAgICAgIGxldCBbYSwgYl0gPSB0aGlzLmNyZWF0ZVJhbmRvbUxpbmVTZWcoKTtcbiAgICAgIHZlcnRpY2VzLnB1c2goYSk7XG4gICAgICB2ZXJ0aWNlcy5wdXNoKGIpO1xuICAgICAgdGhpcy5jZW50ZXIgPSBhLmNvcHkoKS5sZXJwKGIsIDAuNSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2VudGVyID0gY2VudGVyLmNvcHkoKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1TaWRlczsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFuZ2xlID0gKGkgKiBUV09fUEkpIC8gbnVtU2lkZXM7XG4gICAgICAgIHZlcnRpY2VzLnB1c2goXG4gICAgICAgICAgcDUuVmVjdG9yLmZyb21BbmdsZShhbmdsZSlcbiAgICAgICAgICAgIC5tdWx0KHJhZGl1cylcbiAgICAgICAgICAgIC5hZGQodGhpcy5jZW50ZXIpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2ZXJ0aWNlcztcbiAgfVxuICBtYWtlV2FsbHNGcm9tVmVydGljZXModnM6IHA1LlZlY3RvcltdLCBteUNvbG9yOiBwNS5Db2xvcik6IFdhbGxbXSB7XG4gICAgY29uc3Qgd2FsbHM6IFdhbGxbXSA9IFtdO1xuICAgIGlmICh2cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGNvbnN0IHNpbmdsZVdhbGwgPSBuZXcgV2FsbCh2c1swXSwgdnNbMV0pO1xuICAgICAgc2luZ2xlV2FsbC5teUNvbG9yID0gbXlDb2xvcjtcbiAgICAgIHdhbGxzLnB1c2goc2luZ2xlV2FsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG51bVNpZGVzID0gdnMubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1TaWRlczsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGEgPSB2c1tpXTtcbiAgICAgICAgY29uc3QgYiA9IGkgPT09IG51bVNpZGVzIC0gMSA/IHZzWzBdIDogdnNbaSArIDFdO1xuICAgICAgICBjb25zdCB3YWxsID0gbmV3IFdhbGwoYSwgYik7XG4gICAgICAgIHdhbGwubXlDb2xvciA9IG15Q29sb3I7XG4gICAgICAgIHdhbGxzLnB1c2god2FsbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB3YWxscztcbiAgfVxuICBjcmVhdGVSYW5kb21MaW5lU2VnKCk6IHA1LlZlY3RvcltdIHtcbiAgICBjb25zdCBwMSA9IHJhbmRvbVNjcmVlblBvc2l0aW9uKCk7XG4gICAgY29uc3QgcDIgPSBwMS5jb3B5KCkuYWRkKHA1LlZlY3Rvci5yYW5kb20yRCgpLm11bHQocmFuZG9tKDQwLCA0MDApKSk7XG4gICAgcmV0dXJuIFtwMSwgcDJdO1xuICB9XG5cbiAgcm90YXRlKGFuZ2xlUmFkOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnJvdGF0aW9uICs9IGFuZ2xlUmFkO1xuICAgIGNvbnN0IHJvdGF0ZWRWZXJ0aWNlcyA9IHRoaXMuYWJzdHJhY3RWZXJ0aWNlcy5tYXAodiA9PlxuICAgICAgcm90YXRlVmVydGV4QXJvdW5kKHYsIHRoaXMuY2VudGVyLCB0aGlzLnJvdGF0aW9uKVxuICAgICk7XG5cbiAgICAvL3JlbWFrZSB0aGUgd2FsbHNcbiAgICB0aGlzLndhbGxzID0gdGhpcy5tYWtlV2FsbHNGcm9tVmVydGljZXMocm90YXRlZFZlcnRpY2VzLCB0aGlzLm15Q29sb3IpO1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIGxldCBtb3ZlQW10OiBudW1iZXIgPSB0aGlzLm1vdmVtZW50U3BlZWQ7XG4gICAgaWYgKHRoaXMuY2VudGVyLnggKyBtb3ZlQW10IDwgMCkge1xuICAgICAgbW92ZUFtdCArPSB3aWR0aDtcbiAgICB9XG4gICAgdGhpcy5jZW50ZXIueCArPSBtb3ZlQW10O1xuICAgIC8vcmVtYWtlIHRoZSB3YWxsc1xuICAgIHRoaXMud2FsbHMgPSB0aGlzLm1ha2VXYWxsc0Zyb21WZXJ0aWNlcyhcbiAgICAgIHRoaXMuYWJzdHJhY3RWZXJ0aWNlcy5tYXAodiA9PiB2LmFkZChjcmVhdGVWZWN0b3IobW92ZUFtdCwgMCkpKSxcbiAgICAgIHRoaXMubXlDb2xvclxuICAgICk7XG4gICAgaWYgKHRoaXMuc2hvdWxkUm90YXRlKSB7XG4gICAgICB0aGlzLnJvdGF0ZSh0aGlzLnJvdGF0aW9uU3BlZWQpO1xuICAgIH1cbiAgfVxuICBkcmF3KCkge1xuICAgIGZvciAobGV0IHdhbGwgb2YgdGhpcy53YWxscykge1xuICAgICAgd2FsbC5kcmF3KCk7XG4gICAgfVxuICAgIC8vY2lyY2xlKHRoaXMuY2VudGVyLngsIHRoaXMuY2VudGVyLnksIDUpO1xuICAgIGlmICh0aGlzLmlzRmlsbGVkU2hhcGUpIHtcbiAgICAgIGJlZ2luU2hhcGUoKTtcbiAgICAgIGZvciAobGV0IHdhbGwgb2YgdGhpcy53YWxscykge1xuICAgICAgICBmb3IgKGxldCBwdCBvZiBbd2FsbC5hLCB3YWxsLmJdKSB7XG4gICAgICAgICAgdmVydGV4KHB0LngsIHB0LnkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbmRTaGFwZShDTE9TRSk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJhbmRvbSgpIHtcbiAgICBjb25zdCBjZW50ZXIgPSByYW5kb21TY3JlZW5Qb3NpdGlvbigpO1xuICAgIGNvbnN0IG51bVNpZGVzID0gcmFuZG9tKFsxLCAxLCAxLCAzLCA0LCA1LCA2XSk7XG4gICAgcmV0dXJuIG5ldyBTdHJ1Y3R1cmUoY2VudGVyLCByYW5kb20oMjAsIHJhbmRvbSgxMDAsIDIwMCkpLCBudW1TaWRlcyk7XG4gIH1cbn1cbiIsImZ1bmN0aW9uIHJlcGVhdChudW06IG51bWJlciwgZm46IChpeDogbnVtYmVyKSA9PiB2b2lkKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtOyBpKyspIHtcbiAgICBmbihpKTtcbiAgfVxufVxuZnVuY3Rpb24gcmFuZG9tU2NyZWVuUG9zaXRpb24oKTogcDUuVmVjdG9yIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3RvcihyYW5kb20od2lkdGgpLCByYW5kb20oaGVpZ2h0KSk7XG59XG5cbmZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gcm91bmQocmFuZG9tKG1pbiwgbWF4KSk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVRvVmVjKHBvczogcDUuVmVjdG9yKTogdm9pZCB7XG4gIHRyYW5zbGF0ZShwb3MueCwgcG9zLnkpO1xufVxuXG5mdW5jdGlvbiBjZW50ZXJQb3MoKTogcDUuVmVjdG9yIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3Rvcih3aWR0aCAvIDIsIGhlaWdodCAvIDIpO1xufVxuZnVuY3Rpb24gcm90YXRlVmVydGV4QXJvdW5kKFxuICB2ZXJ0ZXg6IHA1LlZlY3RvcixcbiAgcm90T3JpZ2luOiBwNS5WZWN0b3IsXG4gIGFuZ2xlUmFkOiBudW1iZXJcbik6IHA1LlZlY3RvciB7XG4gIHJldHVybiB2ZXJ0ZXhcbiAgICAuY29weSgpXG4gICAgLnN1Yihyb3RPcmlnaW4pXG4gICAgLnJvdGF0ZShhbmdsZVJhZClcbiAgICAuYWRkKHJvdE9yaWdpbik7XG59XG5cbi8vVGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYm1vcmVuL3A1LmNvbGxpZGUyRFxuZnVuY3Rpb24gY29sbGlkZUxpbmVMaW5lKFxuICB4MTogbnVtYmVyLFxuICB5MTogbnVtYmVyLFxuICB4MjogbnVtYmVyLFxuICB5MjogbnVtYmVyLFxuICB4MzogbnVtYmVyLFxuICB5MzogbnVtYmVyLFxuICB4NDogbnVtYmVyLFxuICB5NDogbnVtYmVyXG4pIHtcbiAgLy8gY2FsY3VsYXRlIHRoZSBkaXN0YW5jZSB0byBpbnRlcnNlY3Rpb24gcG9pbnRcbiAgbGV0IHVBID1cbiAgICAoKHg0IC0geDMpICogKHkxIC0geTMpIC0gKHk0IC0geTMpICogKHgxIC0geDMpKSAvXG4gICAgKCh5NCAtIHkzKSAqICh4MiAtIHgxKSAtICh4NCAtIHgzKSAqICh5MiAtIHkxKSk7XG4gIGxldCB1QiA9XG4gICAgKCh4MiAtIHgxKSAqICh5MSAtIHkzKSAtICh5MiAtIHkxKSAqICh4MSAtIHgzKSkgL1xuICAgICgoeTQgLSB5MykgKiAoeDIgLSB4MSkgLSAoeDQgLSB4MykgKiAoeTIgLSB5MSkpO1xuXG4gIC8vIGlmIHVBIGFuZCB1QiBhcmUgYmV0d2VlbiAwLTEsIGxpbmVzIGFyZSBjb2xsaWRpbmdcbiAgaWYgKHVBID49IDAgJiYgdUEgPD0gMSAmJiB1QiA+PSAwICYmIHVCIDw9IDEpIHtcbiAgICAvLyBjYWxjIHRoZSBwb2ludCB3aGVyZSB0aGUgbGluZXMgbWVldFxuICAgIGxldCBpbnRlcnNlY3Rpb25YID0geDEgKyB1QSAqICh4MiAtIHgxKTtcbiAgICBsZXQgaW50ZXJzZWN0aW9uWSA9IHkxICsgdUEgKiAoeTIgLSB5MSk7XG5cbiAgICByZXR1cm4gY3JlYXRlVmVjdG9yKGludGVyc2VjdGlvblgsIGludGVyc2VjdGlvblkpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBtaW5CeTxUPihsaXN0OiBUW10sIGZuOiAoaXRlbTogVCkgPT4gbnVtYmVyKTogVCB7XG4gIGlmIChsaXN0Lmxlbmd0aCA8IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgcmVjb3JkSXRlbSA9IGxpc3RbMF07XG4gIGxldCByZWNvcmRXZWlnaHQgPSBmbihsaXN0WzBdKTtcbiAgZm9yIChsZXQgaXRlbSBvZiBsaXN0KSB7XG4gICAgY29uc3Qgd2VpZ2h0ID0gZm4oaXRlbSk7XG4gICAgaWYgKHdlaWdodCA+IHJlY29yZFdlaWdodCkge1xuICAgICAgcmVjb3JkV2VpZ2h0ID0gd2VpZ2h0O1xuICAgICAgcmVjb3JkSXRlbSA9IGl0ZW07XG4gICAgfVxuICB9XG4gIHJldHVybiByZWNvcmRJdGVtO1xufVxuXG5mdW5jdGlvbiBkaXN0cmlidXRlVXBUbyh0b3RhbDogbnVtYmVyLCBtYXg6IG51bWJlciwgZm46ICh2OiBudW1iZXIpID0+IHZvaWQpIHtcbiAgcmVwZWF0KHRvdGFsLCBpeCA9PiB7XG4gICAgY29uc3QgdmFsID0gKGl4ICogbWF4KSAvIHRvdGFsO1xuICAgIHJldHVybiBmbih2YWwpO1xuICB9KTtcbn1cbmZ1bmN0aW9uIGNvbGxlY3REaXN0cmlidXRlZEJldHdlZW48VD4oXG4gIG51bVNhbXBsZXM6IG51bWJlcixcbiAgbWluOiBudW1iZXIsXG4gIG1heDogbnVtYmVyLFxuICBmbjogKHY6IG51bWJlcikgPT4gVFxuKTogVFtdIHtcbiAgY29uc3QgcmVzdWx0OiBUW10gPSBbXTtcbiAgZGlzdHJpYnV0ZUJldHdlZW4obnVtU2FtcGxlcywgbWluLCBtYXgsIHYgPT4gcmVzdWx0LnB1c2goZm4odikpKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGRpc3RyaWJ1dGVCZXR3ZWVuKFxuICBudW1TYW1wbGVzOiBudW1iZXIsXG4gIG1pbjogbnVtYmVyLFxuICBtYXg6IG51bWJlcixcbiAgZm46ICh2OiBudW1iZXIpID0+IHZvaWRcbikge1xuICByZXBlYXQobnVtU2FtcGxlcywgaXggPT4ge1xuICAgIGNvbnN0IHJhbmdlID0gbWF4IC0gbWluO1xuICAgIGNvbnN0IHZhbCA9IG1pbiArIChpeCAqIHJhbmdlKSAvIG51bVNhbXBsZXM7XG4gICAgcmV0dXJuIGZuKHZhbCk7XG4gIH0pO1xufVxuZnVuY3Rpb24gYXZlcmFnZVZlY3RvcnModnM6IHA1LlZlY3RvcltdKTogcDUuVmVjdG9yIHtcbiAgaWYgKHZzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4gY3JlYXRlVmVjdG9yKDAsIDApO1xuICB9XG4gIHJldHVybiB2cy5yZWR1Y2UoKHYxLCB2MikgPT4gdjEuY29weSgpLmFkZCh2MiksIHZzWzBdKS5kaXYodnMubGVuZ3RoKTtcbn1cblxuLy9UT0RPOiBkb24ndCBwb2xsdXRlIGdsb2JhbFxuY29uc3QgZ0xhc3RNb3VzZU1vdmVtZW50czogcDUuVmVjdG9yW10gPSBbXTtcblxuLy9UT0RPOiBzbW9vdGggdGhpcyBvdXQgYnkgYnVmZmVyaW5nIGEgZmV3IG1vdmVtZW50c1xuLy9NYWludGFpbiB0aGUgcHJldmlvdXMgYW5nbGUgaWYgdGhlcmUncyBiZWVuIG5vIG1vdmVtZW50XG5mdW5jdGlvbiBhbmdsZU9mTGFzdE1vdXNlTW92ZW1lbnQoKTogbnVtYmVyIHtcbiAgY29uc3QgZGVsdGEgPSBjcmVhdGVWZWN0b3IobW91c2VYIC0gcG1vdXNlWCwgbW91c2VZIC0gcG1vdXNlWSk7XG4gIGlmIChkZWx0YS5tYWdTcSgpIDwgMSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgZ0xhc3RNb3VzZU1vdmVtZW50cy51bnNoaWZ0KGRlbHRhKTtcbiAgICBnTGFzdE1vdXNlTW92ZW1lbnRzLnNwbGljZSg4KTtcbiAgICBjb25zdCBhdmdNb3ZlbWVudCA9IGF2ZXJhZ2VWZWN0b3JzKGdMYXN0TW91c2VNb3ZlbWVudHMpO1xuXG4gICAgLy9hdmVyYWdlIG1pZ2h0IGhhdmUgY2FuY2VsbGVkIG91dCBhbmQgdGhlcmVmb3JlIGhhdmUgbm8gaGVhZGluZ1xuICAgIGlmIChhdmdNb3ZlbWVudC5tYWcoKSA+IDApIHtcbiAgICAgIHJldHVybiBhdmdNb3ZlbWVudC5oZWFkaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJhbmRvbUJvb2xlYW4oKTogYm9vbGVhbiB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpID4gMC41O1xufVxuZnVuY3Rpb24gbW91c2VQb3NBc1ZlY3RvcigpIHtcbiAgcmV0dXJuIGNyZWF0ZVZlY3Rvcihtb3VzZVgsIG1vdXNlWSk7XG59XG4iLCJjbGFzcyBXYWxsIHtcbiAgYTogcDUuVmVjdG9yO1xuICBiOiBwNS5WZWN0b3I7XG5cbiAgbXlDb2xvcjogcDUuQ29sb3I7XG5cbiAgY29uc3RydWN0b3IoYTogcDUuVmVjdG9yLCBiOiBwNS5WZWN0b3IpIHtcbiAgICB0aGlzLmEgPSBhLmNvcHkoKTtcbiAgICB0aGlzLmIgPSBiLmNvcHkoKTtcbiAgICB0aGlzLm15Q29sb3IgPSBjb2xvcigyNDMsIDEzNCwgNDgpO1xuICB9XG4gIGRyYXcoKSB7XG4gICAgc3Ryb2tlKHRoaXMubXlDb2xvcik7XG4gICAgc3Ryb2tlV2VpZ2h0KDQpO1xuICAgIGxpbmUodGhpcy5hLngsIHRoaXMuYS55LCB0aGlzLmIueCwgdGhpcy5iLnkpO1xuXG4gICAgbm9TdHJva2UoKTtcbiAgICBmaWxsKHRoaXMubXlDb2xvcik7XG4gICAgW3RoaXMuYSwgdGhpcy5iXS5mb3JFYWNoKHB0ID0+IHtcbiAgICAgIC8vY2lyY2xlKHB0LngsIHB0LnksIDUpO1xuICAgIH0pO1xuICB9XG4gIG1pZFBvaW50KCk6IHA1LlZlY3RvciB7XG4gICAgcmV0dXJuIHRoaXMuYS5jb3B5KCkubGVycCh0aGlzLmIsIDAuNSk7XG4gIH1cblxuICBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gZGlzdCh0aGlzLmEueCwgdGhpcy5hLnksIHRoaXMuYi54LCB0aGlzLmIueSk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmFuZG9tKCkge1xuICAgIGNvbnN0IHAxID0gcmFuZG9tU2NyZWVuUG9zaXRpb24oKTtcbiAgICBjb25zdCBwMiA9IHAxLmNvcHkoKS5hZGQocDUuVmVjdG9yLnJhbmRvbTJEKCkubXVsdChyYW5kb20oNDAsIDQwMCkpKTtcbiAgICByZXR1cm4gbmV3IFdhbGwocDEsIHAyKTtcbiAgfVxufVxuIl19