import mixpanel from 'mixpanel-browser';

const PROD_TOKEN = process.env.REACT_APP_MIXPANEL;
const enabled = Boolean(PROD_TOKEN);

if (PROD_TOKEN) {
    mixpanel.init(PROD_TOKEN);
    mixpanel.set_config({ ip: false });
}

export const Mixpanel = {
    identify: (id: any) => {
        if (enabled) mixpanel.identify(id);
    },
    alias: (id: any) => {
        if (enabled) mixpanel.alias(id);
    },
    track: (name: any, props: any) => {
        if (enabled) mixpanel.track(name, props);
    },
    people: {
        set: (props: any) => {
            if (enabled) mixpanel.people.set(props);
        },
    },
};
