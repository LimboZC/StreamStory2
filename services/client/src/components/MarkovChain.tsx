import { Box, Grid, Paper, styled, Tooltip } from "@material-ui/core";
import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { createSVG, getSVG, TRANSITION_PROPS, createLinearScale, createNodes, createLinks, createMarkers, LinkType, createMatrix, getMatrix } from "../utils/markovChainUtils";
import { ModelVisualizationProps } from "./ModelVisualization";
import { createSlider } from "../utils/sliderUtils";

export interface IMarkoChainProps {
    data: any[],
}

const MarkovChain = ({ model, onStateSelected }: ModelVisualizationProps) => {

    const containerRef = useRef<HTMLDivElement>(null);
    const [initialized, setInitialized] = useState<boolean>(false);
    const [currentScaleIx, setCurrentScaleIx] = useState<number>(0);
    const [maxRadius] = useState<number>(130);
    const [currScaleIx] = useState<number>(0);
    const [windowSize, setWindowSize] = useState<any>({
        width: undefined,
        height: undefined,
    });

    const [pThreshold, setPThreshold] = useState<number>(0.2);
    const [sliderProbPrecision] = useState<number>(2);

    useEffect(() => {
        window.addEventListener("resize", () => {
            console.log("==========================================")
            console.log("window:")
            console.log({ width: window.innerWidth, height: window.innerHeight })
        });


        if (model.model.scales && model.model.scales.length) {
            renderMarkovChain();
        }
    }, [model.model.scales, windowSize, pThreshold, currentScaleIx]) // eslint-disable-line react-hooks/exhaustive-deps

    function renderMarkovChain(): void {

        console.log("start: renderMarkovChain")

        console.log(model.model.scales)

        const width = containerRef?.current?.offsetWidth || 150;
        const height = 700;
        const margin = { top: 20, right: 20, bottom: 20, left: 20, };
        const chart = { top: 50, left: 50 };

        const data = createGraphData(model.model.scales);

        if (model.model.scales[currentScaleIx]) {

            const xWidth = width - chart.left - margin.left - margin.right;
            const yWidth = height - chart.top - margin.top - margin.bottom;

            let graph = null;
            let matrix = null;
            let gNodes = null;
            let gLinks = null;
            let gMarkers = null;
            let gSliderProb = null;
            let gSliderScale = null;

            console.log(`initialized = ${initialized} `);

            if (!initialized) {
                graph = createSVG(containerRef, width, height, margin);

                matrix = createMatrix(graph, width, height, chart);

                matrix.append("rect")
                    .attr("width", xWidth)
                    .attr("height", yWidth)
                    .style("fill", "#1a6048")
                    .style("opacity", "0.1")
                    .style("stroke-width", "1")
                    .style("stroke", "white");

                gLinks = matrix.append("g").attr("class", "links");
                gNodes = matrix.append("g").attr("class", "nodes");
                gMarkers = matrix.append("g").attr("class", "markers");
                gSliderProb = matrix.append("g").attr("class", "slider_prob");
                gSliderScale = matrix.append("g").attr("class", "slider_scale");
                setInitialized(true);
            } else {
                graph = getSVG(containerRef, width, height, margin);

                matrix = getMatrix(graph)

                gLinks = matrix.select("g.links");
                gNodes = matrix.select("g.nodes");
                gMarkers = matrix.select("g.markers");
                gSliderProb = matrix.select("g.slider_prob");
                gSliderScale = matrix.select("g.slider_scale");
            }

            // const boundary = findMinMaxValues(scales); // FIXME: ds

            const boundary = { // FIXME: hardcoded
                x: { min: 0, max: 300 },
                y: { min: 0, max: 300 },
                r: { min: 0, max: 300 },
            }

            const x = createLinearScale([boundary.x.min, boundary.x.max], [0, xWidth]);
            const y = createLinearScale([boundary.y.max, boundary.y.min], [yWidth, 0]);
            const r = createLinearScale([boundary.r.min, boundary.r.max], [0, xWidth / 10]);
            const color = d3.scaleOrdinal(d3.schemeTableau10);
            const xSliderProb = createLinearScale([0, 1], [0, xWidth]).clamp(true);
            const ySliderScale = createLinearScale([0, model.model.scales.length], [yWidth, 0]).clamp(true);

            const format2Decimals = d3.format(`.${sliderProbPrecision}f`);
            const formatInt = d3.format(".0f");

            const graphData = data[currentScaleIx]

            console.log("graphData:")
            console.log(graphData)

            if (graphData) {
                // FIXME: when moved to if init, duplicate colors should not be the issue
                createNodes(graphData, gNodes, gLinks, gMarkers, x, y, r, color, TRANSITION_PROPS, (a: any, b: any) => {
                    const selectedState = model.model.scales[currentScaleIx].states.find((state: any) => state.stateNo === b); // eslint-disable-line no-param-reassign
                    onStateSelected(selectedState);
                });


                if (!initialized) {
                    createSlider(gSliderProb, xSliderProb, yWidth, pThreshold, false, true, true, format2Decimals, (p: number) => setPThreshold(p));


                    let prevIx = -1;
                    createSlider(gSliderScale, ySliderScale, yWidth, currScaleIx, true, false, false, formatInt, (val: number) => {
                        const valFloor = Math.floor(val);

                        if (valFloor !== prevIx) {
                            console.log(valFloor)
                            setCurrentScaleIx(valFloor)
                            prevIx = valFloor;
                        }
                    });
                }

                createLinks(graphData, gNodes, gLinks, TRANSITION_PROPS);
                createMarkers(graphData, gMarkers);
            }
        }
    }

    function createGraphData(scales: any) {
        const dict: any = {}

        return scales.map((scale: any) => {
            const stateNoArr: any[] = scale.states.map((state: any) => state.stateNo)
            const nodes: any[] = [];
            const links: any[] = [];

            console.log("==========================================")
            scale.states.forEach((state: any, i: number) => {

                let x = -1;
                let y = -1;

                if (scale.areTheseInitialStates) {
                    console.log("if")
                    const currAngle = (360 / scale.states.length) * i;
                    x = (maxRadius * Math.sin(Math.PI * 2 * currAngle / 360) + maxRadius);
                    y = (maxRadius * Math.cos(Math.PI * 2 * currAngle / 360) + maxRadius);
                    dict[state.stateNo] = { x, y }

                } else if (!scale.areTheseInitialStates && !dict[state.stateNo]) {
                    console.log("else if")
                    let xSum = 0;
                    let ySum = 0;
                    state.childStates.forEach((stateNo: number) => {
                        xSum += dict[stateNo].x;
                        ySum += dict[stateNo].y;
                    });
                    x = xSum / state.childStates.length;
                    y = ySum / state.childStates.length;

                    dict[state.stateNo] = { x, y }
                } else {
                    // console.log("else, dict[stateNo]=", dict[state.stateNo])
                    console.log("else, stateNo=", state.stateNo)
                }

                nodes.push({
                    id: state.stateNo,
                    ix: state.stateNo,
                    x: dict[state.stateNo].x,
                    y: dict[state.stateNo].y,
                    r: maxRadius,
                    name: state.suggestedLabel ? state.suggestedLabel.label : state.stateNo,
                    label: state.suggestedLabel ? state.suggestedLabel.label : state.stateNo,
                    stationaryProbability: state.stationaryProbability,
                })

                const currStateLinks = state.nextStateProbDistr
                    .filter((p: number) => p >= pThreshold)
                    .map((p: number, pIx: number) => ({
                        source: stateNoArr[i],
                        target: stateNoArr[pIx],
                        p,
                    }));

                links.push(currStateLinks)
            });

            console.log("dict=", dict)

            const obj = { nodes, links: links.flat() };

            obj.links = obj.links.map((link: any) => {
                let linkType: LinkType;
                const isBidirect = obj.links
                    .some((l: any) => ((link.source === l.target) && (link.target === l.source)));

                if (link.source === link.target) {
                    linkType = LinkType.SELF;
                } else if (isBidirect) {
                    linkType = LinkType.BIDIRECT;
                } else {
                    linkType = LinkType.SINGLE;
                }
                return { ...link, linkType }
            });
            return obj
        });
    }

    function findMinMaxValues(dataset: any[]) {
        const rez = {
            x: { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER },
            y: { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER },
            r: { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER }
        }

        dataset.forEach((height: any) => {
            height.states.forEach((state: any) => {
                rez.x.min = Math.min(rez.x.min, state.x);
                rez.x.max = Math.max(rez.x.max, state.x);
                rez.y.min = Math.min(rez.y.min, state.y);
                rez.y.max = Math.max(rez.y.max, state.y);
                rez.r.min = Math.min(rez.r.min, state.radius * state.stationaryProbability);
                rez.r.max = Math.max(rez.r.max, state.radius * state.stationaryProbability);
            });
        });
        return rez;
    }

    return (

        <>
            <div ref={containerRef} style={{ backgroundColor: "#272b30" }} />
        </>
    );
};

export default MarkovChain;
