function inheritPrototype(childObj, parentObj) {
    /* Douglas Crockford parasitic object inheritance */
    var cParent = Object.create(parentObj.prototype);
    cParent.constructor = childObj;
    childObj.prototype = cParent;
}

function contains2D(array, element) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][0] == element[0] && array[i][1] == element[1])
            return true;
    }
    return false;
}

var Elements = {
    HWALL: 0,
    VWALL: 1,
    ARG: 2,
    RESULT: 3,
    SOURCE: 4,
    SINK: 5,
    ENABLER: 6,
    REMOVER: 7,
    HTML: 8
}

var Ex = {
    INFO: 0,
    PLANAR: 1,
    SWITCH: 2,
    AND: 3,
    NOT: 4,
    FANOUT: 5,
    FREDKIN: 6
}

function StatArea() {
    /* A StatArea (singleton) specifies properties of the stat region */
    this.x = 0;
    this.y = 0;
    this.w = $(".leftArea").width();
    this.h = $(window).height();
    this.padding = 10;

    this.div = d3.select(".leftArea")
        .append("div")
        .classed("statArea", true);
    this._text = this.div.append("p")
        .classed("text", true);
    this._text.html(["time: " + 0,
                     "running: " + false,
                     "continuous mode: " + "off"
                    ].join("<br>"));
    this._configbox = this.div.append("textarea")
        .attr("onfocus", "this.select()");
    this.div.append("p")
        .classed("text", true)
        .text("Copy this to save your program!");
    this.div.append("hr");
    this.div.append("p")
        .classed("text", true)
        .text("examples");
    this.div.append("a")
        .classed("text", true)
        .text("info")
        .on("click", function () { Examples.load(Ex.INFO); });
    this.div.append("a")
        .classed("text", true)
        .text("planar")
        .on("click", function () { Examples.load(Ex.PLANAR); });
    this.div.append("a")
        .classed("text", true)
        .text("switch")
        .on("click", function () { Examples.load(Ex.SWITCH); });
    this.div.append("a")
        .classed("text", true)
        .text("and")
        .on("click", function () { Examples.load(Ex.AND); });
    this.div.append("a")
        .classed("text", true)
        .text("not")
        .on("click", function () { Examples.load(Ex.NOT); });
    this.div.append("a")
        .classed("text", true)
        .text("fanout")
        .on("click", function () { Examples.load(Ex.FANOUT); });
    this.div.append("a")
        .classed("text", true)
        .text("fredkin")
        .on("click", function () { Examples.load(Ex.FREDKIN); });
}
StatArea.prototype = {
    constructor: StatArea,
    updateText: function () {
        this._text.html(["time: " + State.time,
                         "running: " + State.running,
                         "continuous mode: " + (State.continuousTime ? "on" : "off")
                        ].join("<br>"));
    }
}
StatArea = new StatArea();

function DescArea() {
    /* A DescArea (singleton) specifies properties of the description region */
    this.x = 0;
    this.y = 0;
    this.w = $(".rightArea").width();
    this.h = $(window).height();
    this.padding = 10;

    var rightArea = d3.select(".rightArea");
    this._desc = rightArea.append("div")
        .classed("descTitleArea", true)
        .attr("height", "400px")
        .append("p")
        .classed("text", true);
    this._descbox = rightArea.append("textarea")
        .on("input", (function (self) {
            return function() {
                Metastate.updateConfigbox();
                self._desc.html(self._descbox[0][0].value);
            };
        })(this));
    rightArea.append("p")
        .classed("text", true)
        .text("Type a description here");
}
DescArea.prototype = {
    constructor: DescArea
}
DescArea = new DescArea();


function DrawingArea() {
    /* A DrawingArea (singleton) specifies properties of the drawable region */
    this.x = StatArea.w; // Left
    this.y = 0; // Top
    this.w = $(window).width() - 30 - $(".rightArea").width() - this.x;  // Width (in px)
    this.h = $(window).height() - 10;  // Height (in px)

    this._svg = d3.select("body")
        .append("svg")
        .attr("width", this.w)
        .attr("height", this.h)
        .attr("style", "left: " + this.x + "px");

    this.svg = this._svg.append("g")
        .attr("width", this.w)
        .attr("height", this.h);
    this.svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", this.w)
        .attr("height", this.h)
        .style("fill", "white");
    this.svg.on("mousemove", function (e) {
        Metastate.updateGhost(d3.mouse(this)[0], d3.mouse(this)[1]);
    });

    this.svg.on("click", function (e) {
        switch (Metastate.selected) {
            case Elements.HWALL:
            case Elements.VWALL:
            case Elements.ARG:
            case Elements.RESULT:
            case Elements.SOURCE:
            case Elements.SINK:
            case Elements.HTML:
                Metastate.addElement(d3.mouse(this)[0], d3.mouse(this)[1]);
            break;
            case Elements.ENABLER:
                Metastate.toggleElement(d3.mouse(this)[0], d3.mouse(this)[1]);
            break;
            case Elements.REMOVER:
                Metastate.removeElement(d3.mouse(this)[0], d3.mouse(this)[1]);
            break;
        }
    });
}
DA = new DrawingArea();

function Drawable() {
    /* A Drawable object has an 'initialize' property that creates HTML elements onto
     * the <body> and a 'redraw' property that updates these elements. */
}
Drawable.prototype = {
    constructor: Drawable,
    initialize: function() {},
    redraw: function() {}
}

function Grid() {
    /* A Grid (singleton) is a type of Drawable that draws a grid */
    this.tickCount = 26;
    this.minTickCount = 10;
    this.maxTickCount = 50;
    this.xAxisGrid = null;
    this.yAxisGrid = null;
    this.svgXLines = null;
    this.svgYLines = null;
}
inheritPrototype(Grid, Drawable)
Grid.prototype = {
    constructor: Grid,
    initialize: function() {
        // Axes
        var scale = d3.scale.linear()
            .domain([-1, 1])
            .range([-1, 1]);

        var xAxis = d3.svg.axis()
            .scale(scale)
            .tickFormat("")
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(scale)
            .tickFormat("")
            .orient("right");

        this.xAxisGrid = xAxis
            .tickSize(DA.h)
            .tickValues(d3.range(0, DA.w, this.getTickSize()));

        this.yAxisGrid = yAxis
            .tickSize(DA.w)
            .tickValues(d3.range(0, DA.h, this.getTickSize()));

        this.svgXLines = DA.svg.append("g")
            .classed("grid", true)
            .call(this.xAxisGrid);

        this.svgYLines = DA.svg.append("g")
            .classed("grid", true)
            .call(this.yAxisGrid);
    },
    redraw: function() {
        this.xAxisGrid
            .tickValues(d3.range(0, DA.w, this.getTickSize()));
        this.yAxisGrid
            .tickValues(d3.range(0, DA.h, this.getTickSize()));

        this.svgXLines
            .call(this.xAxisGrid);
        this.svgYLines
            .call(this.yAxisGrid);
    },
    zoomIn: function() {
        if (this.tickCount > this.minTickCount)
            this.tickCount--;
    },
    zoomOut: function() {
        if (this.tickCount < this.maxTickCount)
            this.tickCount++;
    },
    getTickSize: function() {
        /* Return the size of grid squares (in pixels) */
        var m = Math.min(DA.w, DA.h);
        return m / this.tickCount;
    },
    getDrawPos: function(x, y) {
        /* Converts grid coordinates to drawable coordinates */
        return [x * this.getTickSize(), y * this.getTickSize()];
    },
    getGridPos: function(x, y) {
        /* Converts drawable coordinates to grid coordinates */
        return [Math.round(x / this.getTickSize()), Math.round(y / this.getTickSize())];
    },
    getGridPosFloor: function(x, y) {
        /* Converts drawable coordinates to grid coordinates (rounding down) */
        return [Math.floor(x / this.getTickSize()), Math.floor(y / this.getTickSize())];
    },
    getGridPosNoround: function(x, y) {
        /* Converts drawable coordinates to grid coordinates (without rounding) */
        return [x / this.getTickSize(), y / this.getTickSize()];
    },
    snapToGrid: function(x, y) {
        return this.getDrawPos.apply(this, this.getGridPos(x, y));
    },
    snapToGridFloor: function(x, y) {
        return this.getDrawPos.apply(this, this.getGridPosFloor(x, y));
    }
}
Grid = new Grid();

function Configuration() {
    /* A Configuration maintains a list of positions that define
     * the starting state of a program */
    this.hwalls = [];
    this.vwalls = [];
    this.sources = [];
    this.sinks = [];
    this.args = [];
    this.results = [];
    this.htmls = [];
}
Configuration.prototype = {
    constructor: Configuration,
    addHtml: function (x, y, h) {
        this.htmls.push([x, y, h]);
    },
    addHWall: function (x, y) {
        if (contains2D(this.hwalls, [x, y]))
            return;
        this.hwalls.push([x, y]);
    },
    addVWall: function (x, y) {
        if (contains2D(this.vwalls, [x, y]))
            return;
        this.vwalls.push([x, y]);
    },
    addSource: function (x, y) {
        if (contains2D(this.sources, [x, y]))
            return;
        this.sources.push([x, y, true]);
    },
    addSink: function (x, y) {
        if (contains2D(this.sinks, [x, y]))
            return;
        this.sinks.push([x, y]);
    },
    addArgument: function (x, y) {
        if (contains2D(this.args, [x, y]))
            return;
        this.args.push([x, y, true]);
    },
    addResult: function (x, y) {
        if (contains2D(this.results, [x, y]))
            return;
        this.results.push([x, y]);
    },
    toString: function () {
        return JSON.stringify([this.hwalls, this.vwalls, this.sources, this.sinks, this.args, this.results, this.htmls, DescArea._descbox[0][0].value]);
    },
    fromString: function (str) {
        var pr = JSON.parse(str);
        this.hwalls = pr[0];
        this.vwalls = pr[1];
        this.sources = pr[2];
        this.sinks = pr[3];
        this.args = pr[4];
        this.results = pr[5];
        this.htmls = pr[6];
        DescArea._descbox[0][0].value = pr[7];
    }
}

function Metastate() {
    /* A Metastate (singleton) handles all the information about the current user's
     * settings; i.e. currently selected element */
    this.selected = null;
    this._ghost = null;
    this._svgs = [];
}
Metastate.prototype = {
    constructor: Metastate,
    initialize: function () {
        this._ghost = DA.svg.append("svg");
    },
    updateGhost: function (mx, my) {
        if (this._ghost != null) {
            this._ghost.remove();
        }
        if (this.selected != null) {
            switch (this.selected) {
                case Elements.VWALL:
                    this._ghost = VWallSprite.constructSVG.apply(this, Grid.snapToGridFloor(mx, my));
                break;
                case Elements.HWALL:
                    this._ghost = HWallSprite.constructSVG.apply(this, Grid.snapToGridFloor(mx, my));
                break;
                case Elements.ARG:
                    this._ghost = ArgSprite.constructSVG.apply(this, Grid.snapToGrid(mx, my));
                break;
                case Elements.RESULT:
                    this._ghost = ResSprite.constructSVG.apply(this, Grid.snapToGrid(mx, my));
                break;
                case Elements.SOURCE:
                    this._ghost = SourceSprite.constructSVG.apply(this, Grid.snapToGrid(mx, my));
                break;
                case Elements.SINK:
                    this._ghost = SinkSprite.constructSVG.apply(this, Grid.snapToGrid(mx, my));
                break;
            }
        }
    },
    addElement: function (mx, my) {
        switch (this.selected) {
            case Elements.HTML:
                var h = prompt("Enter text");
                if (h)
                    State.config.addHtml.apply(State.config, Grid.getGridPosNoround(mx, my).concat(h));
            break;
            case Elements.VWALL:
                State.config.addVWall.apply(State.config, Grid.getGridPosFloor(mx, my));
            break;
            case Elements.HWALL:
                State.config.addHWall.apply(State.config, Grid.getGridPosFloor(mx, my));
            break;
            case Elements.ARG:
                State.config.addArgument.apply(State.config, Grid.getGridPos(mx, my));
            break;
            case Elements.RESULT:
                State.config.addResult.apply(State.config, Grid.getGridPos(mx, my));
            break;
            case Elements.SOURCE:
                State.config.addSource.apply(State.config, Grid.getGridPos(mx, my));
            break;
            case Elements.SINK:
                State.config.addSink.apply(State.config, Grid.getGridPos(mx, my));
            break;
        }
        this.updateSVGs();
        this.updateConfigbox();
    },
    toggleElement: function (mx, my) {
        var pos = Grid.getGridPos(mx, my);
        for (var i = 0; i < State.config.args.length; i++) {
            var arg = State.config.args[i];
            if (arg[0] == pos[0] && arg[1] == pos[1]) {
                arg[2] = !arg[2];
                this.updateSVGs();
                this.updateConfigbox();
                return;
            }
        }
        for (var i = 0; i < State.config.sources.length; i++) {
            var src = State.config.sources[i];
            if (src[0] == pos[0] && src[1] == pos[1]) {
                src[2] = !src[2];
                this.updateSVGs();
                this.updateConfigbox();
                return;
            }
        }
    },
    removeElement: function (mx, my) {
        // Explicitly remove HTML by rounding
        var mpos = Grid.getGridPosNoround(mx, my);

        var arr = State.config.htmls;
        for (var i = 0; i < arr.length; i++) {
            var x = arr[i];
            if (Math.sqrt(Math.pow(x[0] - mpos[0], 2) + Math.pow(x[1] - mpos[1], 2)) < 1) {
                arr.splice(i, 1);
                this.updateSVGs();
                this.updateConfigbox();
                return;
            }
        }

        var pos = Grid.getGridPos(mx, my);

        var elementArrays = [State.config.args,
                             State.config.results,
                             State.config.sources,
                             State.config.sinks,
                             State.config.hwalls,
                             State.config.vwalls];
        for (var j = 0; j < elementArrays.length; j++) {
            var arr = elementArrays[j];
            for (var i = 0; i < arr.length; i++) {
                var x = arr[i];
                if (x[0] == pos[0] && x[1] == pos[1]) {
                    arr.splice(i, 1);
                    this.updateSVGs();
                    this.updateConfigbox();
                    return;
                }
            }
        }
    },
    updateSVGs: function () {
        this._svgs.forEach(function (svg) {
            svg.remove();
        });
        this._svgs = [];
        // Redraw everything
        State.config.htmls.forEach(function (posH) {
            var svg = HTMLSprite.constructSVG.apply(this, Grid.getDrawPos(posH[0], posH[1]).concat(posH[2]));
            this._svgs.push(svg);
        }, this);
        State.config.hwalls.forEach(function (pos) {
            this._svgs.push(HWallSprite.constructSVG.apply(this, Grid.getDrawPos(pos[0], pos[1])));
        }, this);
        State.config.vwalls.forEach(function (pos) {
            this._svgs.push(VWallSprite.constructSVG.apply(this, Grid.getDrawPos(pos[0], pos[1])));
        }, this);
        State.config.sources.forEach(function (posEn) {
            var svg = SourceSprite.constructSVG.apply(this, Grid.getDrawPos(posEn[0], posEn[1]));
            if (!posEn[2]) {
                svg.style("stroke-opacity", 0.5);
            }
            this._svgs.push(svg);
        }, this);
        State.config.sinks.forEach(function (pos) {
            this._svgs.push(SinkSprite.constructSVG.apply(this, Grid.getDrawPos(pos[0], pos[1])));
        }, this);
        State.config.args.forEach(function (posEn) {
            var svg = ArgSprite.constructSVG.apply(this, Grid.getDrawPos(posEn[0], posEn[1]));
            if (!posEn[2]) {
                svg.style("stroke-opacity", 0.5);
                svg.__caption.text("0");
            }
            else {
                svg.__caption.text("1");
            }
            this._svgs.push(svg);
        }, this);
        State.config.results.forEach(function (pos) {
            var svg = ResSprite.constructSVG.apply(this, Grid.getDrawPos(pos[0], pos[1]));
            svg.__caption.text("0");
            for (var i = 0; i < State.balls.length; i++) {
                var ball = State.balls[i];
                if (ball.x == pos[0] && ball.y == pos[1]) {
                    svg.__caption.text("1");
                    break;
                }
            }
            this._svgs.push(svg);
        }, this);
    },
    load: function(jsonStr) {
        if (!jsonStr)
            jsonStr = prompt("Paste your JSON!");
        if (jsonStr) {
            State.stop();
            State.config.fromString(jsonStr);
            this.updateSVGs();
            this.updateConfigbox();
            DescArea._desc.html(DescArea._descbox[0][0].value);
        }
    },
    updateConfigbox: function() {
        StatArea._configbox.text(State.config.toString());
    }
}
Metastate = new Metastate();

function Sprite() {
    /* A Sprite supports a constructSVG function that returns an SVG generator */
}
Sprite.prototype = {
    constructor: Sprite,
    constructSVG: function () {}
}
function HTMLSprite() {}
inheritPrototype(HTMLSprite, Sprite);
HTMLSprite.prototype = {
    constructor: HTMLSprite,
    constructSVG: function (x, y, h) {
        var svg = DA.svg.append("g");
        svg.append("line")
            .attr("x1", x - Grid.getTickSize() * 1 / 8)
            .attr("x2", x + Grid.getTickSize() * 1 / 8)
            .attr("y1", y)
            .attr("y2", y)
            .attr("stroke-width", 1)
            .attr("stroke", "black")
            .attr("shape-rendering", "crispEdges");
        svg.append("line")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", y - Grid.getTickSize() * 1 / 8)
            .attr("y2", y + Grid.getTickSize() * 1 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black")
            .attr("shape-rendering", "crispEdges");
        svg.append("text")
            .attr("x", x + 2)
            .attr("y", y + 2 - Grid.getTickSize() * 1 / 4)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .classed("text", true)
            .attr("shape-rendering", "crispEdges")
            .text(h);
        svg.append("text")
            .attr("x", x)
            .attr("y", y - Grid.getTickSize() * 1 / 4)
            .attr("text-anchor", "middle")
            .classed("text", true)
            .attr("shape-rendering", "crispEdges")
            .text(h);
        return svg;
    }
}
HTMLSprite = new HTMLSprite();

function BallSprite() {}
inheritPrototype(BallSprite, Sprite);
BallSprite.prototype = {
    constructor: BallSprite,
    constructSVG: function (x, y) {
        var svg = DA.svg.append("g");
        svg
            .append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", Grid.getTickSize() / 2)
            .style("fill", "transparent")
            .attr("stroke", "black");
        return svg;
    }
}
function ArgSprite() {}
inheritPrototype(ArgSprite, BallSprite);
ArgSprite.prototype = {
    constructor: ArgSprite,
    constructSVG: function (x, y) {
        var svg = BallSprite.constructSVG(x, y);
        svg.append("line")
            .attr("x1", x - Grid.getTickSize() * 5 / 8)
            .attr("x2", x + Grid.getTickSize() * 5 / 8)
            .attr("y1", y + Grid.getTickSize() * 5 / 8)
            .attr("y2", y - Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.append("line")
            .attr("x1", x)
            .attr("x2", x + Grid.getTickSize() * 5 / 8)
            .attr("y1", y - Grid.getTickSize() * 5 / 8)
            .attr("y2", y - Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.append("line")
            .attr("x1", x + Grid.getTickSize() * 5 / 8)
            .attr("x2", x + Grid.getTickSize() * 5 / 8)
            .attr("y1", y)
            .attr("y2", y - Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.__caption = svg.append("text")
            .attr("x", x + Grid.getTickSize() / 2)
            .attr("y", y + Grid.getTickSize() / 2)
            .classed("text", true)
            .text("1");
        return svg;
    }
}
function ResSprite() {}
inheritPrototype(ResSprite, BallSprite);
ResSprite.prototype = {
    constructor: ResSprite,
    constructSVG: function (x, y) {
        var svg = BallSprite.constructSVG(x, y);
        svg
            .append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", Grid.getTickSize() * 3 / 8)
            .style("fill", "transparent")
            .style("stroke", "black");
        svg.__caption = svg.append("text")
            .attr("x", x + Grid.getTickSize() / 2)
            .attr("y", y + Grid.getTickSize() / 2)
            .classed("text", true)
            .text("0");
        return svg;
    }
}
function SourceSprite() {}
inheritPrototype(SourceSprite, BallSprite);
SourceSprite.prototype = {
    constructor: SourceSprite,
    constructSVG: function (x, y) {
        var svg = BallSprite.constructSVG(x, y);
        svg.append("line")
            .attr("x1", x + Grid.getTickSize() * 5 / 8)
            .attr("x2", x - Grid.getTickSize() * 5 / 8)
            .attr("y1", y + Grid.getTickSize() * 5 / 8)
            .attr("y2", y - Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.append("line")
            .attr("x1", x + Grid.getTickSize() * 5 / 8)
            .attr("x2", x)
            .attr("y1", y + Grid.getTickSize() * 5 / 8)
            .attr("y2", y + Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.append("line")
            .attr("x1", x + Grid.getTickSize() * 5 / 8)
            .attr("x2", x + Grid.getTickSize() * 5 / 8)
            .attr("y1", y)
            .attr("y2", y + Grid.getTickSize() * 5 / 8)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        return svg;
    }
}
function SinkSprite() {}
inheritPrototype(SinkSprite, BallSprite);
SinkSprite.prototype = {
    constructor: SinkSprite,
    constructSVG: function (x, y) {
        var svg = BallSprite.constructSVG(x, y);
        svg.append("line")
            .attr("x1", x - Grid.getTickSize() / 2)
            .attr("x2", x + Grid.getTickSize() / 2)
            .attr("y1", y + Grid.getTickSize() / 2)
            .attr("y2", y - Grid.getTickSize() / 2)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        svg.append("line")
            .attr("x1", x + Grid.getTickSize() / 2)
            .attr("x2", x - Grid.getTickSize() / 2)
            .attr("y1", y + Grid.getTickSize() / 2)
            .attr("y2", y - Grid.getTickSize() / 2)
            .attr("stroke-width", 1)
            .attr("stroke", "black");
        return svg;
    }
}

BallSprite = new BallSprite();
ArgSprite = new ArgSprite();
ResSprite = new ResSprite();
SourceSprite = new SourceSprite();
SinkSprite = new SinkSprite();
function HWallSprite() {}
inheritPrototype(HWallSprite, Sprite);
HWallSprite.prototype = {
    constructor: HWallSprite,
    constructSVG: function (x, y) {
        var svg = DA.svg.append("line")
            .attr("x1", x)
            .attr("x2", x + Grid.getTickSize())
            .attr("y1", y)
            .attr("y2", y)
            .attr("stroke-width", 3)
            .attr("stroke", "black")
            .attr("shape-rendering", "crispEdges");
        return svg;
    }
}
HWallSprite = new HWallSprite();
function VWallSprite() {}
inheritPrototype(VWallSprite, Sprite);
VWallSprite.prototype = {
    constructor: VWallSprite,
    constructSVG: function (x, y) {
        var svg = DA.svg.append("line")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", y)
            .attr("y2", y + Grid.getTickSize())
            .attr("stroke-width", 3)
            .attr("stroke", "black")
            .attr("shape-rendering", "crispEdges");
        return svg;
    }
}
VWallSprite = new VWallSprite();
function RealBallSprite() {}
inheritPrototype(RealBallSprite, Sprite);
RealBallSprite.prototype = {
    constructor: RealBallSprite,
    constructSVG: function (x, y) {
        var svg = DA.svg.append("g");
        svg
            .append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", Grid.getTickSize() / 2)
            .style("fill", "transparent")
            .attr("stroke", "black")
            .attr("stroke-width", 3);
        return svg;
    }
}
RealBallSprite = new RealBallSprite();

function State(config) {
    /* A State (singleton) is the current information of the world
     * Keeps track of all Ball objects */
    this.config = config;
    this.balls = [];
    this.running = false;
    this.time = 0;
    this.continuousTime = false;
    this._svgBalls = [];
    this._interval = null;
}
State.prototype = {
    constructor: State,
    start: function () {
        this.balls = [];

        // Initialize balls at arguments
        this.config.args.forEach(function (pos) {
            if (pos[2])
                this.balls.push(new Ball(pos[0], pos[1], 1, -1));
        }, this);

        // Initialize balls at sources
        this.config.sources.forEach(function (pos) {
            if (pos[2])
                this.balls.push(new Ball(pos[0], pos[1], 1, 1));
        }, this);

        // Redraw balls
        this.balls.forEach(function (ball) {
            this._svgBalls.push(RealBallSprite.constructSVG.apply(this, Grid.getDrawPos(ball.x, ball.y)));
        }, this);
        // Update element texts
        Metastate.updateSVGs();

        this.running = true;
        this.continuousTime = false;
        this.time = 0;
        this._interval = setInterval((function (self) {
            return function () {
                if (self.running && self.continuousTime) {
                    self.step();
                    StatArea.updateText();
                }
            }
        })(this), 50);
    },
    run: function () {
        this.continuousTime = true;
        this.running = true;
    },
    pause: function () {
        this.continuousTime = !this.continuousTime;
    },
    step: function () {
        if (this.running) {
            this.balls.forEach(function (ball) {
                // First, check for trivial collisions with walls
                // This is only a problem if we are in half-step
                if (Math.floor(ball.x) != ball.x || Math.floor(ball.y) != ball.y) {
                    if (contains2D(this.config.vwalls, [ball.x + 0.5 * ball.dx, ball.y - 0.5]))
                        ball.dx *= -1;
                    if (contains2D(this.config.hwalls, [ball.x - 0.5, ball.y + 0.5 * ball.dy]))
                        ball.dy *= -1;
                }
            }, this);
    
            // Check for collisions with other balls
            for (var i = 0; i < this.balls.length; i++) {
                var myBall = this.balls[i];
                for (var j = i + 1; j < this.balls.length; j++) {
                    var otherBall = this.balls[j];
                    // If balls are colliding horizontally
                    if (myBall.dx == otherBall.dx * -1) {
                        if (myBall.x + myBall.dx == otherBall.x && myBall.y == otherBall.y) {
                            myBall.dx *= -1;
                            otherBall.dx *= -1;
                        }
                    }
                    // If balls are colliding vertically
                    if (myBall.dy == otherBall.dy * -1 && myBall.x == otherBall.x) {
                        if (myBall.y + myBall.dy == otherBall.y) {
                            myBall.dy *= -1;
                            otherBall.dy *= -1;
                        }
                    }
                }
            }
    
            // Propagate motion
            this.balls.forEach(function (ball) {
                ball.x += ball.dx * 0.5;
                ball.y += ball.dy * 0.5;
            });

            // Check for results
            this.config.results.forEach(function (res) {
                this.balls.forEach(function (ball) {
                    if (ball.x == res[0] && ball.y == res[1]) {
                        // Found a result! Freeze the program
                        this.continuousTime = false;
                    }
                }, this);
            }, this);

            // Redraw all balls
            this._svgBalls.forEach(function (svg) {
                svg.remove();
            });
            this._svgBalls = [];
            this.balls.forEach(function (ball) {
                this._svgBalls.push(RealBallSprite.constructSVG.apply(this, Grid.getDrawPos(ball.x, ball.y)));
            }, this);

            this.time += 0.5;
            Metastate.updateSVGs();
        }
    },
    stepBack: function () {
        if (this.running && this.time > 0) {        
            // Check for results
            this.config.results.forEach(function (res) {
                this.balls.forEach(function (ball) {
                    if (ball.x == res[0] && ball.y == res[1]) {
                        // Found a result! Freeze the program
                        this.continuousTime = false;
                    }
                }, this);
            }, this);

            // Propagate motion
            this.balls.forEach(function (ball) {
                ball.x -= ball.dx * 0.5;
                ball.y -= ball.dy * 0.5;
            });

            // Check for collisions with other balls
            for (var i = 0; i < this.balls.length; i++) {
                var myBall = this.balls[i];
                for (var j = i + 1; j < this.balls.length; j++) {
                    var otherBall = this.balls[j];
                    // If balls are colliding horizontally
                    if (myBall.dx == otherBall.dx * -1) {
                        if (myBall.x - myBall.dx == otherBall.x && myBall.y == otherBall.y) {
                            myBall.dx *= -1;
                            otherBall.dx *= -1;
                        }
                    }
                    // If balls are colliding vertically
                    if (myBall.dy == otherBall.dy * -1) {
                        if (myBall.y - myBall.dy == otherBall.y && myBall.x == otherBall.x) {
                            myBall.dy *= -1;
                            otherBall.dy *= -1;
                        }
                    }
                }
            }

            this.balls.forEach(function (ball) {
                // First, check for trivial collisions with walls
                // This is only a problem if we are in half-step
                if (Math.floor(ball.x) != ball.x || Math.floor(ball.y) != ball.y) {
                    if (contains2D(this.config.vwalls, [ball.x - 0.5 * ball.dx, ball.y - 0.5]))
                        ball.dx *= -1;
                    if (contains2D(this.config.hwalls, [ball.x - 0.5, ball.y + 0.5 - ball.dy]))
                        ball.dy *= -1;
                }
            }, this);

            // Redraw all balls
            this._svgBalls.forEach(function (svg) {
                svg.remove();
            });
            this._svgBalls = [];
            this.balls.forEach(function (ball) {
                this._svgBalls.push(RealBallSprite.constructSVG.apply(this, Grid.getDrawPos(ball.x, ball.y)));
            }, this);

            this.time -= 0.5;
            Metastate.updateSVGs();
        }
    },
    stop: function () {
        if (this.running) {
            this.running = false;
            this.continuousTime = false;
            this.time = 0;
            this.balls = [];
            if (this._interval) {
                clearInterval(this._interval);
            }
            this._svgBalls.forEach(function (svg) {
                svg.remove();
            });
            this._svgBalls = [];
            Metastate.updateSVGs();
        }
    }
}
State = new State(new Configuration());

function Ball(x, y, dx, dy) {
    /* A Ball is a Drawable that stores position and momentum
     * position and momentum are stored as grid coordinates
     * */
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
}
inheritPrototype(Ball, Drawable);
Ball.prototype = {
    constructor: Ball,
    initialize: function() {
    },
    redraw: function() {
    }
}

Grid.initialize();

function Examples () {}
Examples.prototype = {
    constructor: Examples,
    load: function (ex) {
        switch (ex) {
            case Ex.INFO:
                Metastate.load('[[[10,9],[11,9],[10,11],[11,11],[10,13],[11,13],[12,9],[12,11],[12,13],[10,15],[11,15],[12,15]],[],[[8,8,true]],[[15,8]],[[8,14,true],[8,16,true]],[[15,14],[15,16]],[[14.961119751166407,12.939346811819597,"results"],[7.884914463452566,13.020217729393469,"arguments"],[14.961119751166407,6.954898911353033,"sinks"],[7.84447900466563,6.995334370139969,"sources"]],"This is a conservative logic computer.  Press E and click the sources and arguments to enable / disable them, and press U to run the program.  All values are binary.<br><br>Arguments - Parameters put into the program<br><br>Results - The result of the computation<br><br>Sources - Constants put into the program<br><br>Sinks - Garbage information.  More garbage = higher entropy = faster heat death of the universe!<br><br>The wonderful thing is about conservative logic is you actually do not need garbage at all!  Since every operation is reversible, you can always take the garbage and reverse the operations to get your original inputs, recycling it.<br><br>Hence, it is possible to build, at the logical level, an arbitrarily complex computer with zero internal entropy.<br><br>Kudos to Fredkin, Toffoli, Feynman, and Ressler for most of the circuits.<br>(Fredkin, Toffoli; Conservative Logic, 1981)"]');
            break;
            case Ex.PLANAR:
                Metastate.load('[[[6,9],[12,9],[13,7],[14,11],[14,7],[13,11],[15,11],[16,11],[12,7],[21,12],[23,8],[23,11]],[[15,8],[13,9],[17,8],[15,7],[17,10],[17,9],[13,10],[17,7]],[[4,6,true],[10,6,true],[20,6,true],[20,10,true]],[],[],[],[[5.692068429237947,10.295489891135304,"Turning"],[14.898911353032661,12.628304821150856,"Arbitrary delays"],[21.959564541213066,13.374805598755833,"Signal crossover"]],"A 2D grid of bouncing billiard balls is just as expressive as a physical circuit.  From left to right: Turning, arbitrarily long delays, and signal crossover."]');
            break;
            case Ex.SWITCH:
                Metastate.load('[[[8,6],[10,7],[12,12]],[],[],[],[[7,12,true],[7,8,true]],[[16,7],[16,14],[16,3]],[[6.09642301710731,8.211508553654744,"c"],[6.065318818040436,12.19284603421462,"x"],[17.91601866251944,7.1850699844479005,"cx"],[17.884914463452567,3.203732503888025,"(~c)x"],[17.91601866251944,14.090202177293936,"c"]],"The switch gate takes two arguments, c and x.<br><br>c always passes through the circuit unchanged, but x gets routed to either cx or (~c)x depending on what c is."]');
            break;
            case Ex.AND:
                Metastate.load('[[[8,6]],[],[],[[12,11]],[[7,12,true],[7,8,true]],[[12,6]],[[6.003110419906688,8.087091757387247,"a"],[5.9720062208398135,12.03732503888025,"b"],[13.12597200622084,5.940902021772939,"ab"]],"This is an AND gate.  It only triggers if both inputs are 1.  Notice how similar this is to the switch gate!"]');
            break;
            case Ex.NOT:
                Metastate.load('[[],[],[[7,7,true]],[[12,7],[13,5]],[[7,12,false]],[[12,12],[13,14]],[[5.940902021772939,11.975116640746501,"x"],[14.090202177293936,13.96578538102644,"x"],[13.032659409020217,12.006220839813375,"~x"],[5.940902021772939,6.9673405909797825,"1"]],"This is a NOT gate."]');
            break;
            case Ex.FANOUT:
                Metastate.load('[[[9,12]],[],[[7,8,true]],[[13,14]],[[7,12,true]],[[13,5],[13,8]],[[6.065318818040436,12.19284603421462,"x"],[6.003110419906688,8.024883359253499,"1"],[13.96578538102644,5.0077760497667185,"x"],[13.934681181959565,7.993779160186626,"x"]],"This is a FAN OUT gate.  It makes a copy of x.<br><br>Note that with AND, NOT, and FAN OUT, our billiard ball computer is Turing complete!"]');
            break;
            case Ex.FREDKIN:
                Metastate.load('[[[2,10],[4,14],[3,10],[5,14],[2,14],[3,14],[2,16],[3,16],[4,16],[5,16],[8,10],[9,10],[8,14],[9,14],[10,14],[11,14],[8,8],[9,8],[10,4],[11,6],[13,3],[14,3],[13,9],[13,11],[13,13],[14,13],[14,11],[14,9],[14,6],[15,8],[16,5],[16,8],[15,3],[17,8],[18,2],[19,2],[20,2],[18,6],[19,8],[20,6],[15,9],[16,9],[17,9],[18,9],[19,9],[20,9],[15,11],[16,11],[17,11],[18,11],[19,11],[20,11],[15,13],[16,13],[17,13],[20,13],[19,13],[18,13],[21,9],[21,11],[21,13],[24,4],[23,6],[25,8],[26,8],[25,10],[26,10],[23,14],[24,14],[25,14],[26,14],[29,14],[30,14],[31,14],[32,14],[32,16],[31,16],[30,16],[29,16],[32,10],[31,10]],[],[],[],[[1,14,true],[1,16,true],[1,12,true]],[[34,12],[34,14],[34,16]],[[7.060653188180405,8.118195956454121,"(~c)x"],[6.9673405909797825,10.015552099533437,"cx"],[7.029548989113531,12.068429237947123,"c"],[13.063763608087092,12.03732503888025,"c"],[13.001555209953345,9.984447900466563,"cy"],[12.908242612752723,8.055987558320373,"(~c)y"],[12.939346811819597,6.003110419906688,"cx"],[12.939346811819597,4.0124416796267495,"(~c)x"],[10.046656298600311,12.006220839813375,"switch gate (c and y)"],[3.981337480559876,11.975116640746501,"switch gate (c and x)"],[14.463452566096423,4.510108864696734,"trivial crossover"],[16.51632970451011,6.500777604976673,"nontrivial crossover"],[17.97822706065319,3.079315707620529,"cx"],[18.009331259720064,5.038880248833593,"(~c)y"],[17.947122861586315,6.998444790046657,"(~c)x"],[19.533437013996892,3.421461897356143,"trivial crossover"],[20.995334370139968,3.048211508553655,"(~c)y"],[22.052877138413688,3.981337480559876,"(~c)y"],[21.99066874027994,6.034214618973562,"cx"],[22.021772939346814,8.024883359253499,"(~c)x"],[20.964230171073094,5.0077760497667185,"cx"],[22.021772939346814,10.046656298600311,"cy"],[22.083981337480562,12.006220839813375,"c"],[35.22550544323484,12.052877138413686,"c"],[35.53654743390358,14.074650077760499,"cx+(~c)y"],[35.45878693623639,16.1353032659409,"(~c)x+cy"],[0.24261275272161742,11.968895800933126,"c"],[0.2021772939346812,14.031104199066874,"x"],[0.24261275272161742,16.052877138413688,"y"],[24.948678071539657,11.92846034214619,"inverse switch gate"],[30.933125972006223,12.049766718507,"inverse switch gate"]],"This is a Fredkin gate.  When c is 0, x and y are swapped.  When c is 1, x and y stay the same.<br><br>This implementation uses four switch gates and one nontrivial crossover."]');
            break;
        }
    }
}
Examples = new Examples();
Examples.load(Ex.INFO);

$("body").keydown(function(e) {
    if (document.activeElement === DescArea._descbox[0][0])
        return;
    switch(e.keyCode) {
        case 38:  // UP
          Grid.zoomIn();
          Grid.redraw();
          Metastate.updateSVGs();
        break;
        case 40:  // DOWN
          Grid.zoomOut();
          Grid.redraw();
          Metastate.updateSVGs();
        break;
        case 81:  // Q
          Metastate.selected = Elements.VWALL;
        break;
        case 87:  // W
          Metastate.selected = Elements.HWALL;
        break;
        case 65:  // A
          Metastate.selected = Elements.ARG;
        break;
        case 83:  // S
          Metastate.selected = Elements.RESULT;
        break;
        case 68:  // D
          Metastate.selected = Elements.SOURCE;
        break;
        case 70:  // F
          Metastate.selected = Elements.SINK;
        break;
        case 85:  // U
          // Run
          State.stop();
          State.start();
          State.run();
          StatArea.updateText();
        break;
        case 73:  // I
          // Start / Restart
          State.stop();
          State.start();
          StatArea.updateText();
        break;
        case 79:  // O
          // Stop
          State.stop();
          StatArea.updateText();
        break;
        case 80:  // P
          // Pause
          State.pause();
          StatArea.updateText();
        break;
        case 74:  // J
          // Step Forward
          State.step();
          StatArea.updateText();
        break;
        case 75:  // K
          // Step Backward
          State.stepBack();
          StatArea.updateText();
        break;
        case 69:  // E
          // Enable / Disable
          Metastate.selected = Elements.ENABLER;
        break;
        case 82:  // R
          // Remover
          Metastate.selected = Elements.REMOVER;
        break;
        case 76:  // L
          // Load
          Metastate.load();
        break;
        case 84:  // T
          // Add Text
          Metastate.selected = Elements.HTML;
        break;
    }
});
