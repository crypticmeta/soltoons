import mixpanel from 'mixpanel-browser';

const DEV_TOKEN = "5fa23edbf619e78b0fc68a47f493167d";
const PROD_TOKEN = process.env.REACT_APP_MIXPANEL || "408be05565562b2e9a9fa44f0ebef018";
if (window.location.hostname.toLowerCase().includes('localhost')) {
    mixpanel.init(DEV_TOKEN, { debug: true });
    mixpanel.set_config({
        ip: true,
        ignore_dnt: true,
    });
    console.log('tracking on devlopment id')
} else {
    mixpanel.init(PROD_TOKEN);
    mixpanel.set_config({
        ip: true,
        ignore_dnt: true,
    });
    console.log('tracking on production id')
}
let actions = {
    identify: (id: any) => {
        mixpanel.identify(id);
    },
    alias: (id: any) => {
        mixpanel.alias(id);
    },
    track: (name: any, props: any) => {
        mixpanel.track(name, props);
    },
    people: {
        set: (props: any) => {
            mixpanel.people.set(props);
        },
    },
};

export let Mixpanel = actions;
