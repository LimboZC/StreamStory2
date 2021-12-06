import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

import {
    createSVG,
    getSVG,
    addColorsToScaleStates,
    createGraphContainer,
    getGraphContainer,
} from '../utils/markovChainUtils';
import { ModelVisualizationProps } from './ModelVisualization';

const StateHistory = ({ model }: ModelVisualizationProps) => {
    const containerStateHistoryRef = useRef<HTMLDivElement>(null);
    const [initializedStateHistory, setInitializedStateHistory] = useState<boolean>(false);
    const [windowSize] = useState<any>({ width: undefined, height: undefined });

    useEffect(() => {
        if (model.model.scales && model.model.scales.length) {
            console.log('model=', model);
            console.log('model.model.scales=', model.model.scales);
            addColorsToScaleStates(model.model.scales);
            createStateHistory();
        }
    }, [model.model.scales, containerStateHistoryRef?.current?.offsetWidth]); // eslint-disable-line react-hooks/exhaustive-deps

    function createDate(unixTimestamp: number) {
        return new Date(unixTimestamp * 1000);
    }

    function createStateHistory() {
        const width = containerStateHistoryRef?.current?.offsetWidth || 150; // FIXME: hardcoded
        const height = 450; // FIXME: hardcoded
        const chart = { top: 20, left: 20 }; // FIXME: hardcodeds
        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        const xWidth = width - chart.left - margin.left - margin.right;
       
        const baseHeight = height - chart.top - margin.top  - margin.bottom;
        const subChartOffset = baseHeight * 0.05; // dist between top bars and brushBars
        const yWidth = 0.95 * (baseHeight- 2*subChartOffset); // height of bars
        const yWidthPreview = 0.1 * (baseHeight-2*subChartOffset) // height of brushBars

        const xExtent: any = d3.extent(model.model.stateHistoryTimes, (d: number) => createDate(d));
        const yCategories: any = model.model.scales.map((el: any, i: any) => `${i}`);

        const dataCurr = createDataCurr();

        const x = d3.scaleTime().domain(xExtent).range([0, xWidth]);
        const y = d3.scaleBand().domain(yCategories).range([yWidth, 0]).padding(0.1);
        const xBrush = d3.scaleTime().domain(xExtent).range([0, xWidth]);
        const yBrush = d3.scaleBand().domain(yCategories).range([yWidthPreview, 0]).padding(0.1);

        let graph:any = null;
        let gGraphContainer:any = null;  // eslint-disable-line prefer-const
        let gGraphContainerClip:any = null;  // eslint-disable-line prefer-const
        let gBarsContainer:any = null;  // eslint-disable-line prefer-const
        let gBrushBarsContainer:any = null;  // eslint-disable-line prefer-const
        let gAxisX: any = null; // eslint-disable-line prefer-const
        let gAxisXBrush: any = null; // eslint-disable-line prefer-const
        let gAxisY: any = null; // eslint-disable-line prefer-const
        let gBars: any = null; // eslint-disable-line prefer-const
        let gBrushBars: any = null; // eslint-disable-line prefer-const

        if (!initializedStateHistory) {
            graph = createSVG(containerStateHistoryRef, width, height, margin)

            graph.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("SVG:rect")
            .attr("width", xWidth)
            .attr("height", baseHeight)
            .attr("x", 0)
            .attr("y", 0);
            
            gGraphContainer = createGraphContainer(graph, width, height, chart)

            gGraphContainerClip = gGraphContainer.append('g')
                .attr("class", "graphContainerClip")
                .attr("clip-path", "url(#clip)")

            gBarsContainer = gGraphContainerClip.append("g").attr("class", "barsContainer")
        
            gBars = gBarsContainer.append('g').attr('class', 'bars')
            gAxisX =  gBarsContainer.append("g").attr("class", "xAxis")
            
            gBrushBarsContainer = gGraphContainerClip.append("g").attr("class", "brushBarsContainer")
            gBrushBars = gBrushBarsContainer.append('g').attr('class', 'brushBars')
            gAxisXBrush =  gBrushBarsContainer.append("g").attr("class", "xAxisBrush")
       
            setInitializedStateHistory(true);
        } 
        else {
            graph = getSVG(containerStateHistoryRef, width, height, margin);

            gGraphContainer = getGraphContainer(graph) // .attr("clip-path", "url(#clip)");
            gGraphContainerClip = gGraphContainer.select(".graphContainerClip").attr("clip-path", "url(#clip)")

            gBarsContainer = gGraphContainerClip.select("g.barsContainer")  
            gBars = gBarsContainer.select('g.bars')
            gAxisX = gBarsContainer.select("g.xAxis")
            
            gBrushBarsContainer = gGraphContainerClip.select("g.brushBarsContainer")
            gBrushBars = gBrushBarsContainer.select('g.brushBars')
            gAxisXBrush = gBrushBarsContainer.select("g.xAxisBrush")
        }

        gBrushBarsContainer.attr("transform", `translate(0, ${yWidth + subChartOffset})`);
             
        const xAxis = d3
            .axisBottom(x)
            .tickSizeOuter(0);
        
        gAxisX
        .attr('transform', `translate(0, ${yWidth})`)
        .call(xAxis);

        const xAxisBrush: any = d3.axisBottom(xBrush).tickSizeOuter(0);
        gAxisXBrush
            .attr('transform', `translate(0, ${yWidthPreview})`)
            .call(xAxisBrush);

        const levels = gBars
            .selectAll('g')
            .data(dataCurr, (d: any) => d.scaleIx)
            .join('g')
            .attr("class", "level")
            .attr('id', (d: any) => `scale_${d.scaleIx}`);

        levels
            .selectAll('rect')
            .data((d: any) => d.states, (d:any)=> `scaleIx_${d.scaleIx}_start_${d.start}_end_${d.end}`)
            .join('rect')
            .attr('class', 'state')
            .attr('id', (d: any) => `${d.stateNo}`)
            .attr('x', (d: any) => x(d.start))
            .attr('y', (d: any) => y(`${d.scaleIx}`))
            .attr('width', (d: any) => x(d.end) - x(d.start))
            .attr('height', (d: any) => y.bandwidth())
            .attr('fill', (d: any) => d.color)
            .on('mouseover', function (this: any) {
                d3.select(this).style('cursor', 'pointer');
            })
            .on('mouseout', function (this: any) {
                d3.select(this).style('cursor', 'default');
            })
            .on('click', (event: any, d: any) => {             
                d3.selectAll(`.level > rect.state`)
                    .style("stroke", "white").style("stroke-width", (dCurr:any)=> {
                        let strokeWidth = "0px";
                        const result =  d.initStates.every((initState:any) => dCurr.initStates.includes(initState));

                        if(dCurr.scaleIx === d.scaleIx && dCurr.stateNo === d.stateNo) {
                            strokeWidth = "2px"
                        } else if(dCurr.scaleIx !== d.scaleIx && result) {
                            strokeWidth = "2px"
                        }
                    return strokeWidth
                })
            });

        const brushLevels = gBrushBars
            .selectAll('g')
            .data(dataCurr, (d: any) => d.scaleIx)
            .join('g')
            .attr("class", "brushLevel")
            .attr('id', (d: any) => `scale_${d.scaleIx}`);

        brushLevels
            .selectAll('rect')
            .data((d: any) => d.states)
            .join('rect')
            .attr('class', 'state')
            .attr('id', (d: any) => `${d.stateNo }`)
            .attr('x', (d: any) => xBrush(d.start))
            .attr('y', (d: any) => yBrush(`${d.scaleIx}`))
            .attr('width', (d: any) => xBrush(d.end) - xBrush(d.start))
            .attr('height', (d: any) => yBrush.bandwidth())
            .attr('fill', (d: any) => d.color);

        let sourceEvent: any;

        const brush = d3
            .brushX()
            .extent([
                [0, 0],
                [xWidth, yWidthPreview],
            ])
            .on('brush start', ()=> {
                d3.select(".selection")
                .attr("opacity", 0.6)
                .attr("fill", "blue");
            })
            .on('brush end', function (this: any, event: any) {
                const rangeSelection: any = d3.brushSelection(this);
                if (rangeSelection != null && event.sourceEvent != null) {
                    const xAxisNewRange = rangeSelection.map(xBrush.invert);
                    x.domain(xAxisNewRange);

                    gAxisX.call(d3.axisBottom(x).tickSizeOuter(0));

                    levels
                        .selectAll('rect')
                        .data((d: any) => d.states)
                        .join(
                            (enter: any) => enter,
                            (update: any) =>
                                update
                                    .attr('x', (d: any) => x(d.start))
                                    .attr('y', (d: any) => y(`${d.scaleIx}`))
                                    .attr('width', (d: any) => x(d.end) - x(d.start))
                                    .attr('height', (d: any) => y.bandwidth()),
                            (exit: any) => exit.remove(),
                        );
                }
            });

        const zoom = d3
            .zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([
                [0, 0],
                [width, height],
            ])
            .extent([
                [0, 0],
                [width, height],
            ])
            .on('zoom', (event: any) => {
                if (sourceEvent === 'brush') return; // ignore zoom-by-brush
                sourceEvent = 'zoom';
                const t: any = event.transform;
                x.domain(t.rescaleX(xBrush).domain());
                gBrushBars.call(brush).call(brush.move, (x as any).range().map(t.invertX, t));
                sourceEvent = null;

                gAxisX.call(d3.axisBottom(x).tickSizeOuter(0));

                levels
                    .selectAll('rect')
                    .data((d: any) => d.states)
                    .join(
                        (enter: any) => enter,
                        (update: any) =>
                            update
                                .attr('x', (d: any) => x(d.start))
                                .attr('y', (d: any) => y(`${d.scaleIx}`))
                                .attr('width', (d: any) => x(d.end) - x(d.start))
                                .attr('height', (d: any) => y.bandwidth()),
                        (exit: any) => exit.remove(),
                    );
            });

        gBars.call(zoom);

        gBrushBars.call(brush).call(brush.move, xBrush.range());
    }

    function createDataCurr() {

        const {
            model: { scales, stateHistoryInitialStates: initialStates, stateHistoryTimes: times },
        } = model;

        
        const dataCurr: any = [];

        scales.forEach((sc: any, scaleIx: number) => {
            const statesCurr: any = [];

            if (scaleIx === 0) {
                initialStates.forEach((initState: any, stateIx: number) => {
                    const state = scales[scaleIx].states.find(
                        (currState: any) => currState.stateNo === initState,
                    );
                    statesCurr.push({
                        start: createDate(times[stateIx]),
                        end: createDate(times[stateIx + 1]),                        
                        initStates: state.initialStates,
                        stateNo: `${initialStates[stateIx]}`,
                        scaleIx: `${scaleIx}`,
                        color: state.color,
                    });
                });
            } else {
                const initStatesDict: any = {};

                for (let j = 0; j < scales[scaleIx].states.length; j++) {
                    const state = scales[scaleIx].states[j];

                    for (let k = 0; k < state.initialStates.length; k++) {
                        const initialState = state.initialStates[k];
                        initStatesDict[initialState] = state.stateNo;
                    }
                }

                let startIx = 0;

                initialStates.forEach((initState: any, stIx: number) => {
                    const startStateNo = initStatesDict[initialStates[startIx]];
                    const currStateNo = initStatesDict[initialStates[stIx]];
                    let startIxNew = -1;

                    if (currStateNo !== startStateNo) {
                        startIxNew = stIx;
                    }
                    if (currStateNo === startStateNo && stIx < initialStates.length - 1) {
                        return;
                    }

                    const stateCurr = sc.states.find(
                        (state: any) => state.stateNo === startStateNo,
                    );

                    statesCurr.push({
                        start: createDate(times[startIx]),
                        end: createDate(times[stIx]),
                        initStates: stateCurr.initialStates,
                        stateNo: `${initStatesDict[initialStates[startIx]]}`,
                        scaleIx: `${scaleIx}`,
                        color: stateCurr.color,
                    });
                    startIx = startIxNew;
                });
            }
            dataCurr.push({ scaleIx, states: statesCurr });
        });
        return dataCurr;
    }


    return (
            <div ref={containerStateHistoryRef} />
    );
};

export default StateHistory;
