export default class Chat {
    sender: string;
    receiver: string;
    message: string;
    timestamp: number;
    private broadcast: boolean = false;
    id: string = '';

    constructor(sender: string, receiver: string, message: string) {
        this.sender = sender;
        this.receiver = receiver;
        this.message = message;
        this.timestamp = new Date().getTime();
    }

    isBroadCast() {
        return this.broadcast;
    }

    setBroadCast(value: boolean) {
        this.broadcast = value;
    }
}