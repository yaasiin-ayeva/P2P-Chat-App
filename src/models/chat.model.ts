export default class Chat {
    sender: string;
    receiver: string;
    message: string;
    timestamp: number;
    broadcast: boolean = false;
    id: string = '';

    constructor(sender: string, receiver: string, message: string) {
        this.sender = sender;
        this.receiver = receiver;
        this.message = message;
        this.timestamp = new Date().getTime();
    }
}