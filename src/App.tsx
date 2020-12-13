import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Button, Dropdown, Navbar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import * as d3 from "d3";
import { brush, select, Selection } from "d3";

import pen1 from "./statics/pen1.svg";
import eraser from "./statics/eraser.svg";
import pixels from "./statics/pixels.svg";

import file from "./statics/file.svg";
import undo from "./statics/undo.svg";
import redo from "./statics/redo.svg";

const LightenColor = (color: string, percent: number) => {
  var num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = ((num >> 8) & 0x00ff) + amt,
    G = (num & 0x0000ff) + amt;

  return (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
    (G < 255 ? (G < 1 ? 0 : G) : 255)
  )
    .toString(16)
    .slice(1);
};

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const colorRef = useRef<SVGSVGElement | null>(null);
  const [selection, setSelection] = useState<null | Selection<SVGSVGElement | null, unknown, null, undefined>>(null);
  const [colorSelection, setColorSelection] = useState<null | Selection<
    SVGSVGElement | null,
    unknown,
    null,
    undefined
  >>(null);

  const constants = {
    pixelWidth: 10,
    pixelHeight: 10,
    svgCanvasWidth: 600,
    svgCanvasHeight: 400,
    colorCellWidth: 30,
    colorCellHeight: 30,
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
  // const lastCanvasState: Pixel[] = [];
  /** TODO
   * undo redo
   * use data stack, and track how many nodes in each move
   * remove and exit last n nodes => undo
   */

  interface Color {
    colorCode: string;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colorData: Color[] = [];
  const originColorData: string[] = [];

  // and grey color
  originColorData.push("#111111");
  for (let i = 0; i < 20; i++) {
    originColorData.push(hslToHex((360 / 20) * i, 88, 66));
  }
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

  for (let i = 0; i < originColorData.length; i++) {
    for (let j = 0; j < 6; j++) {
      colorData.push({ colorCode: `#${LightenColor(originColorData[i], j * 8)}` });
    }
  }

  var preIndexX: number = -1;
  var preIndexY: number = -1;
  interface BrushState {
    brushType: BrushType;
    color: string;
  }
  // TODO: change to set state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  var brushState: BrushState = {
    brushType: BrushType.pen,
    color: "#555",
  };

  const drawBetween = (preX: number, preY: number, curX: number, curY: number) => {
    // draw pixels between to positions that far from each other
    const dx = curX - preX;
    const dy = curY - preY;
    const slope = dy / dx;
    const verticalSlope = dx / dy;
    // x is long axis
    if (Math.abs(dx) > Math.abs(dy)) {
      for (let x = preX; x !== curX + (preX < curX ? 1 : -1); x += preX < curX ? 1 : -1) {
        const newY = Math.round(preY + slope * (x - preX));
        d3.select(`#p${x}-${newY}`).attr("fill", getFillColor(x, newY));
      }
    }
    // y is long axis
    else {
      for (let y = preY; y !== curY + (preY < curY ? 1 : -1); y += preY < curY ? 1 : -1) {
        const newX = Math.round(preX + verticalSlope * (y - preY));
        d3.select(`#p${newX}-${y}`).attr("fill", getFillColor(newX, y));
      }
    }
  };

  const getFillColor = (xIndex: number, yIndex: number): string => {
    var result: string;
    if (brushState.brushType === BrushType.pen) {
      result = brushState.color;
    } else if (brushState.brushType === BrushType.eraser) {
      result = (xIndex + yIndex) % 2 === 0 ? "#ddd" : "#fff";
    } else {
      result = "none";
    }
    return result;
  };

  const changeCursor = (cursorName: string) => {
    const canvas = document.getElementById("canvas")!;
    canvas.className = "canvas";

    canvas.classList.add(`use-${cursorName}`);
    switch (cursorName) {
      case "pen1":
        brushState.brushType = BrushType.pen;
        break;
      case "eraser":
        brushState.brushType = BrushType.eraser;
        break;
      default:
        brushState.brushType = BrushType.default;
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
          const xIndex = Math.floor(d3.pointer(event)[0] / constants.pixelWidth);
          const yIndex = Math.floor(d3.pointer(event)[1] / constants.pixelHeight);

          const currentColor = getFillColor(xIndex, yIndex);
          if (currentColor === "none") {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            preIndexX = -1;
            // eslint-disable-next-line react-hooks/exhaustive-deps
            preIndexY = -1;
            return;
          }

          d3.select(this).attr("fill", currentColor);
          if (preIndexX === -1) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            preIndexX = xIndex;
          }
          if (preIndexY === -1) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            preIndexY = yIndex;
          }
        })
        // on mouse over
        .on("mousemove", function (event) {
          // if is in drawing, -1 means not drawing
          if (preIndexX !== -1 && preIndexY !== -1) {
            const curIndexX = Math.floor(d3.pointer(event)[0] / constants.pixelWidth);
            const curIndexY = Math.floor(d3.pointer(event)[1] / constants.pixelHeight);
            if (preIndexX !== curIndexX || preIndexY !== curIndexY) {
              // if distance between two mouse position is large than 2 => at least on pixel could insert into the gap
              if (Math.abs(preIndexX - curIndexX) > 1 || Math.abs(preIndexY - curIndexY) > 1) {
                // drawBetween(curIndexX, curIndexY);
                drawBetween(preIndexX, preIndexY, curIndexX, curIndexY);
              } else {
                d3.select(`#p${curIndexX}-${curIndexY}`).attr("fill", getFillColor(curIndexX, curIndexY));
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
        });
    }
  }, [constants.pixelHeight, constants.pixelWidth, data, selection]);

  // color panel
  useEffect(() => {
    if (!colorSelection) {
      setColorSelection(select(colorRef.current));
    } else {
      const colors = colorSelection;
      colors
        .selectAll("rect")
        .data(colorData)
        .enter()
        .append("rect")
        .attr("width", constants.colorCellWidth)
        .attr("height", constants.colorCellHeight)
        .attr("x", (_, i) => (i % 6) * (constants.colorCellWidth + 2) + 2)
        .attr("y", (_, i) => Math.floor(i / 6) * (constants.colorCellHeight + 2) + 2)
        .attr("fill", (d) => d.colorCode)
        .attr("rx", 2)
        .attr("ry", 2)
        .on("click", (event) => {
          brushState.color = event.target.attributes.fill.nodeValue;
          document.getElementById("current-color")!.style.backgroundColor = brushState.color;
        })
        .on("mouseover", (event) => {
          d3.select(event.target)
            .attr("stroke", "#fff")
            .attr("stroke-dasharray", "5,3")
            .attr("stroke-linecap", "butt")
            .attr("stroke-width", "2");
        })
        .on("mouseout", (event) => {
          d3.select(event.target).attr("stroke-width", "0");
        });
    }
  }, [brushState, colorData, colorSelection, constants.colorCellHeight, constants.colorCellWidth]);

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

  return (
    <div className="three-columns-layout">
      <Navbar variant="dark" className="top-nav-bar">
        <div className="left-menu-box">
          <Dropdown className="margin-left">
            <Dropdown.Toggle variant="secondary" id="dropdown-basic" className="btn-basic">
              <img src={file} alt="file"></img>
              <span>FILE</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="#/action-1" onClick={() => resetData()}>
                NEW
              </Dropdown.Item>
              <Dropdown.Item href="#/action-2" onClick={() => resetData()}>
                CLEAR
              </Dropdown.Item>
              {/* <Dropdown.Item href="#/action-3">Something else</Dropdown.Item> */}
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="secondary" className="btn-basic margin-left">
            <img src={undo} alt="undo"></img>
            <span>UNDO</span>
          </Button>
          <Button variant="secondary" className="btn-basic margin-left">
            <img src={redo} alt="redo"></img>
            <span>REDO</span>
          </Button>
        </div>
        <Navbar.Brand href="#home">
          <div className="header-box-content">
            <img src={pixels} alt="pixels" width="40" height="40"></img>
            <div className="header">LE PIXEL</div>
          </div>
        </Navbar.Brand>
        <div></div>
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
          </div>
        </div>
        <div className="canvas use-pen1" id="canvas">
          <svg
            ref={svgRef}
            className="svg-canvas"
            width={constants.svgCanvasWidth}
            height={constants.svgCanvasHeight}
          ></svg>
        </div>
        <div className="right-tool-bar tool-bar">
          <div className="header">
            <h2>DEFAULT COLORS</h2>
            <div className="current-color" id="current-color" style={{ backgroundColor: brushState.color }}></div>
          </div>
          <div className="color-panel-container">
            <svg ref={colorRef} className="color-panel"></svg>
          </div>
        </div>
      </div>
      <div className="bottom-nav-bar"></div>
    </div>
  );
}

export default App;
