import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Button, Navbar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import * as d3 from "d3";
import { select, Selection } from "d3";

import pen1 from "./statics/pen1.svg";
import eraser from "./statics/eraser.svg";
// import pen1 from "./statics/pen1.svg";
import pixels from "./statics/pixels.svg";

function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selection, setSelection] = useState<null | Selection<SVGSVGElement | null, unknown, null, undefined>>(null);

  const constants = {
    pixelWidth: 10,
    pixelHeight: 10,
    svgCanvasWidth: 400,
    svgCanvasHeight: 300,
  };

  enum BrushType {
    default,
    pointer,
    pen,
    eraser,
  }
  interface Pixel {
    id: string;
    xIndex: number;
    yIndex: number;
    width: number;
    height: number;
    color: string;
  }

  const data: Pixel[] = [];

  // init value
  /* add init setup here
  
  */
  for (let j = 0; j < constants.svgCanvasHeight / constants.pixelHeight; j++) {
    for (let i = 0; i < constants.svgCanvasWidth / constants.pixelWidth; i++) {
      data.push({
        id: `p${i}-${j}`,
        xIndex: i,
        yIndex: j,
        width: constants.pixelWidth,
        height: constants.pixelWidth,
        color: (j + i) % 2 === 0 ? "#ddd" : "#fff",
      });
    }
  }

  var preIndexX: number = -1;
  var preIndexY: number = -1;
  interface BrushState {
    brushType: BrushType;
  }
  // TODO: change to set state
  var brushState: BrushState = {
    brushType: BrushType.pointer,
  };

  const drawBetween = (curX: number, curY: number, preX: number, preY: number) => {
    // draw pixels between to positions that far from each other
    const dx = curX - preX;
    const dy = curY - preY;
    const slope = dy / dx;
    const verticalSlope = dx / dy;
    // x is long axis
    if (Math.abs(dx) > Math.abs(dy)) {
      console.log(slope);
      for (let x = preX; x !== curX + (preX < curX ? 1 : -1); x += preX < curX ? 1 : -1) {
        d3.select(`#p${x}-${Math.round(preY + slope * (x - preX))}`).attr("fill", "rgb(60, 120, 254)");
      }
    }
    // y is long axis
    else {
      console.log(verticalSlope);
      for (let y = preY; y !== curY + (preY < curY ? 1 : -1); y += preY < curY ? 1 : -1) {
        d3.select(`#p${Math.round(preX + verticalSlope * (y - preY))}-${y}`).attr("fill", "rgb(60, 120, 254)");
      }
    }
  };

  useEffect(() => {
    if (!selection) {
      setSelection(select(svgRef.current));
    } else {
      const rects = selection;
      rects
        .selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("width", (d) => d.width)
        .attr("height", (d) => d.height)
        .attr("fill", (d) => d.color)
        .attr("x", (d) => d.xIndex * constants.pixelWidth)
        .attr("y", (d) => d.yIndex * constants.pixelHeight)
        .attr("id", (d) => d.id)
        // on mouse down
        .on("mousedown", function (event) {
          d3.select(this).attr("fill", "rgb(60, 120, 254)");
          const xIndex = Math.floor(d3.pointer(event)[0] / constants.pixelWidth);
          const yIndex = Math.floor(d3.pointer(event)[1] / constants.pixelHeight);
          if (preIndexX === -1) {
            preIndexX = xIndex;
          }
          if (preIndexY === -1) {
            preIndexY = yIndex;
          }
          // isDrawing = true;
        })
        // on mouse over
        .on("mousemove", function (event) {
          // if is in drawing, -1 means not drawing
          if (preIndexX !== -1 && preIndexY !== -1) {
            // console.log(d3.pointer(event));
            const curIndexX = Math.floor(d3.pointer(event)[0] / constants.pixelWidth);
            const curIndexY = Math.floor(d3.pointer(event)[1] / constants.pixelHeight);
            // console.log(curIndexX, curIndexY);

            if (preIndexX !== curIndexX || preIndexY !== curIndexY) {
              // if distance between two mouse position is large than 2 => at least on pixel could insert into the gap
              if (Math.abs(preIndexX - curIndexX) > 1 || Math.abs(preIndexY - curIndexY) > 1) {
                // drawBetween(curIndexX, curIndexY);
                drawBetween(curIndexX, curIndexY, preIndexX, preIndexY);
              } else {
                d3.select(`#p${curIndexX}-${curIndexY}`).attr("fill", "rgb(60, 120, 255)");
              }

              preIndexX = curIndexX;
              preIndexY = curIndexY;
            }
          }
        })
        // on mouse up
        .on("mouseup", function () {
          preIndexX = -1;
          preIndexY = -1;
          // isDrawing = false;
        });
    }
  }, [constants.pixelHeight, constants.pixelWidth, data, selection]);

  const resetData = () => {
    preIndexX = -1;
    preIndexY = -1;
    data.forEach((pixel) => {
      d3.select(`#p${pixel.xIndex}-${pixel.yIndex}`).attr(
        "fill",
        (pixel.yIndex + pixel.xIndex) % 2 === 0 ? "#ddd" : "#fff"
      );
    });
    changeCursor("");
  };

  const changeCursor = (cursorName: string) => {
    const canvas = document.getElementById("canvas")!;
    canvas.className = "canvas";

    canvas.classList.add(`use-${cursorName}`);
    switch (cursorName) {
      case "pen":
        brushState.brushType = BrushType.pen;
        break;
      case "eraser":
        brushState.brushType = BrushType.eraser;
        break;
      default:
        brushState.brushType = BrushType.default;
    }
  };

  return (
    <div className="three-columns-layout">
      <Navbar variant="dark" className="top-nav-bar">
        <Navbar.Brand href="#home">
          <div className="header-box-content">
            <img src={pixels} alt="pixels" width="40" height="40"></img>
            <div className="header">Le Pixel</div>
          </div>
        </Navbar.Brand>
      </Navbar>
      <div className="middle-content">
        <div className="left-tool-bar tool-bar">
          <div className="button-group">
            <Button variant="secondary" className="tool-btn" onClick={() => changeCursor("pen1")}>
              <img src={pen1} alt="pen1" width="20" height="20"></img>
            </Button>
            <Button variant="secondary" className="tool-btn" onClick={() => changeCursor("eraser")}>
              <img src={eraser} alt="pen1" width="20" height="20"></img>
            </Button>
            {/* <Button variant="secondary" className="tool-btn"></Button>
            <Button variant="secondary" className="tool-btn"></Button> */}
          </div>
        </div>
        <div className="canvas" id="canvas">
          <svg
            ref={svgRef}
            className="svg-canvas"
            width={constants.svgCanvasWidth}
            height={constants.svgCanvasHeight}
          ></svg>
        </div>
        <div className="right-tool-bar tool-bar">
          <Button variant="primary" onClick={() => resetData()}>
            Reset
          </Button>
        </div>
      </div>
      <div className="bottom-nav-bar"></div>
    </div>
  );
}

export default App;
