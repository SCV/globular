"use strict";

/*
    Stochastic Simulation class
*/

function timeSampler(rate)
{
	return -1*(Math.log(Math.random()))/rate;
}

function dimensionHelper(processesDim, diagramDim, historyOn){
    if(processesDim === diagramDim)
    {
        historyOn = true;
    }
    else{
        historyOn = false;
    }
}