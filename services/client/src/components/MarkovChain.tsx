import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@material-ui/core/styles';

import {
    createSVG,
    getSVG,
    createLinearScale,
    createNodes,
    createLinks,
    createMarkers,
    createGraphContainer,
    getGraphContainer,
    findMinMaxValues,
    createGraphData,
    addColorsToScaleStates,
    colorBlueNodeAndLinks,
    createCommonStateData,
    stateId,
} from '../utils/markovChainUtils';
import { ModelVisualizationProps } from './ModelVisualization';
import { createSlider } from '../utils/sliderUtils';
import { TRANSITION_PROPS } from '../types/charts';

const MarkovChain = ({ model, selectedState, onStateSelected }: ModelVisualizationProps) => {
    const useThemeLoaded = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [initialized, setInitialized] = useState<boolean>(false);
    const [currentScaleIx, setCurrentScaleIx] = useState<number>(-1);
    const [currentState, setCurrentState] = useState<any>();
    const [data, setData] = useState<any>();
    const [commonStateDataCurr, setCommonStateDataCurr] = useState<any>();
    const [windowSize] = useState<any>({ width: undefined, height: undefined });
    const [pThreshold, setPThreshold] = useState<number>(0.1);
    const [sliderProbPrecision] = useState<number>(2);

    function createTheme() {
        const themeCurr = {
            state: {
                default: {
                    stroke: '#a0a0a0',
                    opacity: 0.9,
                },
                selected: {
                    stroke: '#337ab7',
                    opacity: 0.9,
                },
            },
            stateText: {
                default: {
                    fill: 'white',
                },
            },
            link: {
                default: {
                    stroke: '#a0a0a0',
                },
                selected: {
                    stroke: '#337ab7',
                },
            },
            linkText: {
                default: {
                    fill: useThemeLoaded.palette.text.primary,
                },
            },
            marker: {
                default: {
                    stroke: '#a0a0a0',
                    fill: '#a0a0a0',
                },
                selected: {
                    stroke: '#337ab7',
                    fill: '#337ab7',
                },
            },
            slider: {
                default: {
                    trackStrokeWidth: '8px',
                    trackInsetStrokeWidth: '2px',
                    opacity: 0.1,
                },
                mouseOver: {
                    trackStrokeWidth: '10px',
                    trackInsetStrokeWidth: '8px',
                    opacity: 0.4,
                },
            },
        };
        return themeCurr;
    }

    useEffect(() => {
        if (model.model.scales && model.model.scales.length) {
            console.log('model=', model);
            console.log('model.model.scales=', model.model.scales);

            const maxRadius = 100; // FIXME: hardcoded

            model.model.scales.forEach((sc: any) => {
                sc.states.forEach((state: any) => {
                    state.x = state.xCenter; // eslint-disable-line no-param-reassign
                    state.y = state.yCenter; // eslint-disable-line no-param-reassign
                    state.r = state.radius * maxRadius; // eslint-disable-line no-param-reassign
                });
            });

            const commonStateData = createCommonStateData(model.model.scales);

            setCommonStateDataCurr(commonStateData);
            setCurrentScaleIx(model.model.scales.length - 1);
            addColorsToScaleStates(model.model.scales, commonStateData);
            const graphData = createGraphData(model.model.scales, pThreshold);
            setData(graphData);
            renderMarkovChain(graphData, commonStateData);
        }
    }, [model.model.scales]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            pThreshold >= 0 &&
            currentScaleIx >= 0 &&
            model.model.scales &&
            model.model.scales.length &&
            data &&
            data.length
        ) {
            const graphData = createGraphData(model.model.scales, pThreshold);
            setData(graphData);
            renderMarkovChain(graphData, commonStateDataCurr);
        }
    }, [windowSize, pThreshold, currentScaleIx, useThemeLoaded, currentState]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (selectedState) {
            setCurrentState(selectedState);
            setCurrentScaleIx(selectedState.scaleIx);
        }
    }, [selectedState]);

    function renderMarkovChain(graphData: any, commonStateData: any): void {
        const format2Decimals = d3.format(`.${sliderProbPrecision}f`); // FIXME: move to another file
        const theme = createTheme();
        const boundary = findMinMaxValues(model.model.scales);
        const width = containerRef?.current?.offsetWidth || 150; // FIXME: hardcoded
        const height = 700; // FIXME: hardcoded
        const margin = { top: 5, right: 5, bottom: 10, left: 10 }; // FIXME: hardcoded
        const chart = { top: 130, left: 100 }; // FIXME: hardcoded
        const xWidth = width - chart.left - margin.left - margin.right;
        const yWidth = height - chart.top - margin.top - margin.bottom;

        if (graphData && model.model.scales[currentScaleIx]) {
            let graph = null;
            let graphContainer = null;
            let gNodes = null;
            let gLinks = null;
            let gMarkers = null;
            let gSliderProb = null;
            let gSliderScale: any = null;

            if (!initialized) {
                graph = createSVG(containerRef, width, height, margin); // FIXME: hardcoded theme
                gSliderProb = graph.append('g').attr('class', 'slider_prob');
                gSliderScale = graph.append('g').attr('class', 'slider_scale');
                graphContainer = createGraphContainer(graph, width, height, chart);
                gLinks = graphContainer.append('g').attr('class', 'links');
                gNodes = graphContainer.append('g').attr('class', 'nodes');
                gMarkers = graphContainer.append('g').attr('class', 'markers');
                setInitialized(true);
            } else {
                graph = getSVG(containerRef, width, height, margin);
                gSliderProb = graph.select('g.slider_prob');
                gSliderScale = graph.select('g.slider_scale');
                graphContainer = getGraphContainer(graph);
                gLinks = graphContainer.select('g.links');
                gNodes = graphContainer.select('g.nodes');
                gMarkers = graphContainer.select('g.markers');
            }
            let direction = 1; // FIXME: not elegant solution
            const zoom = d3
                .zoom<any, any>()
                .scaleExtent([0, 20])
                .wheelDelta((event: any) => {
                    direction = event.deltaY > 0 ? 1 : -1;
                    return (
                        event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) // eslint-disable-line  no-nested-ternary
                    );
                })
                .on('zoom', (event: any) => {
                    const scaleIxNew = currentScaleIx + direction;

                    if (Math.floor(event.transform.k) % 1 === 0) {
                        setCurrentScaleIx(scaleIxNew);
                        const val = scaleIxNew;
                        const ySliderScale = createLinearScale(
                            [0, model.model.scales.length - 1],
                            [yWidth, 0],
                        ).clamp(true);
                        gSliderScale.select('.handle').attr('cx', ySliderScale(val));
                        gSliderScale.select('.label').attr('x', ySliderScale(val));
                    }
                });

            graph.select('.zoom_rect').call(zoom);
            gNodes.call(zoom);
            gLinks.call(zoom);

            graphContainer.attr('transform', `translate(${chart.left},${chart.top}) scale(0.8)`); // FIXME: hardcoded scale

            const x = createLinearScale([boundary.x.min, boundary.x.max], [0, xWidth]);
            const y = createLinearScale([boundary.y.max, boundary.y.min], [yWidth, 0]);
            const r = createLinearScale(
                [boundary.r.min, boundary.r.max],
                [yWidth / 20, yWidth / 5],
            );
            const xSliderProb = createLinearScale([0, 1], [0, xWidth]).clamp(true);
            const ySliderScale = createLinearScale(
                [0, model.model.scales.length - 1],
                [yWidth, 0],
            ).clamp(true);

            createNodes(
                theme,
                graphData[currentScaleIx],
                gNodes,
                gLinks,
                gMarkers,
                tooltipRef,
                x,
                y,
                r,
                commonStateData,
                TRANSITION_PROPS,
                handleOnStateSelected,
            );
            if (!initialized) {
                const probStartX = 50;
                const probStartY = height - 50;

                createSlider(
                    theme,
                    gSliderProb,
                    xSliderProb,
                    probStartX,
                    probStartY,
                    pThreshold,
                    false,
                    false,
                    true,
                    format2Decimals,
                    handleOnProbChanged,
                );

                const scaleStartX = 0 + margin.left + 20;
                const scaleStartY = 0 + margin.right + 20;

                createSlider(
                    theme,
                    gSliderScale,
                    ySliderScale,
                    scaleStartX,
                    scaleStartY,
                    model.model.scales.length - 1,
                    true,
                    false,
                    false,
                    null,
                    handleOnScaleChanged,
                );
            }
            createLinks(theme, graphData[currentScaleIx], gNodes, gLinks, x, y, TRANSITION_PROPS);
            createMarkers(theme, graphData[currentScaleIx], gMarkers);

            if (currentState) {
                const selectedNodeGroup: any = d3.select(`#${stateId(currentState)}`);

                if (selectedNodeGroup) {
                    colorBlueNodeAndLinks(selectedNodeGroup, theme, gNodes, gLinks, gMarkers);
                }
            }
        }
    }

    function handleOnStateSelected(event: any, stateNo: number) {
        const currState = model.model.scales[currentScaleIx].states.find(
            (state: any) => state.stateNo === stateNo,
        );
        onStateSelected(currState);
    }

    function handleOnProbChanged(p: number) {
        setPThreshold(p);
    }

    function handleOnScaleChanged(val: number) {
        setCurrentScaleIx(Math.floor(val));
        onStateSelected(null);
    }

    return (
        <>
            <div ref={tooltipRef} />
            <div ref={containerRef} />
        </>
    );
};

export default MarkovChain;
