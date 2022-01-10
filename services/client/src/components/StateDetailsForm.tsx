import React, { useRef, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import CancelIcon from '@material-ui/icons/Cancel';
import SaveIcon from '@material-ui/icons/Save';
import useSession from '../hooks/useSession';

import LoadingButton from './LoadingButton';
import { updateModelState, Model as ModelType } from '../api/models';
import { addColorsToScaleStates, createCommonStateData } from '../utils/markovChainUtils';

function StateDetailsForm({ model, selectedState, commonStateData }: any): JSX.Element {
    const { t } = useTranslation();

    const [{ currentModel, commonStateDataArr }, setSession] = useSession();

    const [label, setLabel] = useState<string>();
    const [description, setDescription] = useState<string>();
    const [isEvent, setIsEvent] = useState(true);
    const [eventId, setEventId] = useState<string>();

    useEffect(() => {
        if(selectedState && commonStateData) {
            const key = selectedState.initialStates.toString();
            const labelCurr = commonStateData[key].ui ? commonStateData[key].ui.label : commonStateData[key].suggestedLabel.label;
            const descriptionCurr = commonStateData[key].ui ? commonStateData[key].ui.description : null;
            const eventIdCurr = commonStateData[key].ui ? commonStateData[key].ui.eventId : null;
            setLabel(labelCurr)
            setDescription(descriptionCurr);
            setEventId(eventIdCurr);
        }
    }, [selectedState, commonStateData])

    async function handleSubmit(event:any) {
        event.preventDefault(); // prevent refresh after submit
        console.log("start: handleSubmit, modelId=", model.id);

        const payload:any = {
            initialStates: selectedState.initialStates.toString(),
            label: event.target.stateName.value,
            description: event.target.stateDescription.value,
        }

        if(isEvent && event.target.eventId.value) { // TODO: only if model is online
            payload.eventId = event.target.eventId.value; // eslint-disable-line
        }
        const response = await updateModelState(model.id, payload);
        const modelNew = response.data.model as ModelType;
        console.log("modelNew=", modelNew)

        // TODO: not optimal to calculate everything once again, refactor it.
        const ixModelInSession = currentModel.findIndex((m) => m.id === Number(model.id));
        const ixCommStateDataArr = commonStateDataArr.findIndex((m) => m.id === Number(model.id));
        console.log("ixModelInSession=", ixModelInSession, ", ixCommStateDataArr=", ixCommStateDataArr)

        const commStateDataNew = {
            id: Number(model.id),
            commonStateData: createCommonStateData(modelNew.model.scales),
        };
        addColorsToScaleStates(modelNew.model.scales, commStateDataNew.commonStateData);
        currentModel[ixModelInSession] = modelNew;
        commonStateDataArr[ixCommStateDataArr] = commStateDataNew;
        setSession({currentModel, commonStateDataArr});

        console.log("end: updateModelState")
    }

    function handleIsEvent(event:any, value:any) {
        setIsEvent(value);
    }

    function handleResetDefaultButtonClick(event:any) {
        console.log("start: handleResetDefaultButtonClick")

        const key = selectedState.initialStates.toString();

        setLabel(commonStateData[key].suggestedLabel.label);
        setDescription("");
    }

    return (
        <form onSubmit={handleSubmit}>
        <TextField
            name="stateName"
            label={t('state_name')}
            value={label || ''}
            onChange={(e) => setLabel(e.target.value)}
            variant="standard"
            margin="none"
            InputLabelProps={{
                required: true,
            }}
            fullWidth
        />
        <TextField
            name="stateDescription"
            label={t('description')}
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
            variant="standard"
            margin="normal"
            // rows={3}
            multiline
            fullWidth
        />

        <FormControlLabel
            label={t('is_event')}
            control={
                <Checkbox
                checked={isEvent}
                onChange={handleIsEvent} // eslint-disable-line
                name="isEvent"
                color="primary"
                />
            }
        />

        {isEvent && (
            <TextField
                name="eventId"
                label={t('event_id')}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                variant="standard"
                margin="normal"
                fullWidth
            />
        )}

        <Grid 
            // className={classes.formButtons}
            spacing={1} 
            container>
            {<Grid item>
                <Button
                    variant="contained"
                    size="small"
                    color="default"
                    startIcon={<CancelIcon />}
                    onClick={handleResetDefaultButtonClick} // eslint-disable-line
                >
                {t('default_values')}
                </Button>
            </Grid> }
            {<Grid item>
                <Button
                    variant="contained"
                    size="small"
                    color="secondary"
                    startIcon={<CancelIcon />}
                    // onClick={handleCancelButtonClick}
                >
                    {t('cancel')}
                </Button>
            </Grid> }
            {<Grid item>
                <LoadingButton
                    type="submit"
                    variant="contained"
                    size="small"
                    color="primary"
                    // loading={isSubmitting}s
                    // disabled={!isDirty}
                    // disabled
                    startIcon={<SaveIcon />}
                >
                    {t('save')}
                </LoadingButton>
            </Grid>}
        </Grid>
    </form>

        

    );
}

export default StateDetailsForm;
