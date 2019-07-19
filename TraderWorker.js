/*var i=0;

function timedCount() {
    i=i+1;
    postMessage(i);
    setTimeout("timedCount()", 500);
}

timedCount();*/



var numberOfTraders = 2;
var dmatAccountBalance = 200;
var expectedProfit = 200;
var profitRate = 1;
var traders = new Array();
var objExchange = new Exchange();
var minimumBet = 1;

function timedCount() {

    if(keepTrading())
      {
        nextCycle();
        var returnObject = JSON.stringify(traders);
        postMessage(returnObject);
        setTimeout("timedCount()", 500);
    }   

   // if(objExchange.itiration < 100)
   // {
   //     nextCycle();
   //     //var balance = traders[0].dmatAccout.balance;
   //     //postMessage(balance);
   //     var returnObject = JSON.stringify(traders);
   //     postMessage(returnObject);
   //     setTimeout("timedCount()", 500);
   // }
   // else
   // {
   //     //postMessage("final balance: " + traders[0].dmatAccout.balance);
   // }
}

timedCount();


function keepTrading()
{
    var returnValue = false;

    if(traders.length == 0)
        return true;

    for(var i = 0; i <= traders.length - 1; i++)
        {
            var balance = traders[i].dmatAccout.balance;
            if (balance < dmatAccountBalance + expectedProfit && balance > 0)
                {
                    returnValue = true;
                    break;
                }
        }

    return returnValue;
}

function createTraders()
{
    //for(var i = 0; i < numberOfTraders; i++)
    //    traders[i] = new Trader(i, "martingale");

        traders[0] = new Trader(0, "martingale");        
        traders[1] = new Trader(1, "martingale-short");     
        traders[2] = new Trader(2, "antimartingale");        
        traders[3] = new Trader(3, "antimartingale-short");     
        traders[4] = new Trader(4, "splitmartingale");
        traders[5] = new Trader(5, "splitmartingale-modified");
}

function nextCycle()
{
    if(traders.length < 1)
    {
        createTraders();
    }

    for(var i = 0; i <= traders.length - 1; i++)
        traders[i].MakeATrade();  

    objExchange.updatePrice();
    
    for(var i = 0; i <= traders.length - 1; i++)
        traders[i].ClosePosition();    
}

function Trader(name, stratagy)
{
    this.name = name;
    this.strategy = new Strategy(stratagy);
    this.dmatAccout = new DMATAccount();

    this.MakeATrade = function(){
        var amount = this.strategy.NextTradeAmount(this.dmatAccout.tradebook);
        if(amount >0)
            this.dmatAccout.Trade(amount, true);
        else
            this.dmatAccout.Trade(Math.abs(amount), false);
    }

    this.ClosePosition = function()
    {
        this.dmatAccout.ClosePosition();
    }
}


function TradebookEntry()
{
    this.amount;
    this.isBuy;
    this.price;
    this.profit;
}

function DMATAccount()
{

    this.balance = dmatAccountBalance;
    this.tradebook = new Array();

    this.Trade = function(amount, isBuy)
    {
        if(this.balance < 1)
            return;

        if(this.balance > dmatAccountBalance + expectedProfit)
            return;
        
        this.tradebook[this.tradebook.length] = new TradebookEntry();
        this.tradebook[this.tradebook.length - 1].amount = amount;
        this.tradebook[this.tradebook.length - 1].isBuy = isBuy;
        this.tradebook[this.tradebook.length - 1].price = objExchange.price;
        this.tradebook[this.tradebook.length - 1].profit = -1 * amount; //closing position
    }

    this.ClosePosition = function()
    {
        if(this.balance < 1)
            return;

        if(this.tradebook[this.tradebook.length - 1].isBuy == true)
            {
                if(objExchange.price > this.tradebook[this.tradebook.length - 1].price)
                    {
                        this.tradebook[this.tradebook.length - 1].profit = this.tradebook[this.tradebook.length - 1].amount * objExchange.profitRate;
                    }
            }
        else
        {
                if(objExchange.price < this.tradebook[this.tradebook.length - 1].price)
                    this.tradebook[this.tradebook.length - 1].profit = Math.abs(this.tradebook[this.tradebook.length - 1].amount) * objExchange.profitRate;
        }


        this.balance += this.tradebook[this.tradebook.length - 1].profit;
    }
}


function Exchange()
{
    this.itiration = 0;
    this.price = 100;
    this.profitRate = profitRate; //profit after brokerage cut

    this.updatePrice = function()
    {
        this.itiration ++;
        this.price += 1*(Math.random()-.5);
        this.price = Math.abs(this.price);
    }
}



function Strategy(name)
{
    this.name = name;
    this.initiationFlag = false;
    this.NextTradeAmount = function(tradebook)
    {
        //https://en.wikipedia.org/wiki/Betting_strategy
        switch(this.name)
        {
            case"martingale-short":
            case"martingale":
            {
                var multiplier = 1;
                if(this.name == "martingale-short")
                    multiplier = multiplier * (-1)

                if(tradebook.length < 1)
                    return 1 * multiplier;

                if(tradebook[tradebook.length - 1].profit > 0)
                    return 1 * multiplier;
                else
                {
                    if(profitRate > .9)
                        return tradebook[tradebook.length - 1].amount * 2 * multiplier;
                    else
                        return tradebook[tradebook.length - 1].amount * 3 * multiplier;
                }
            }
            break;
            case"antimartingale-short":
            case"antimartingale":
                var multiplier = 1;
                if(this.name == "antimartingale-short")
                    multiplier = multiplier * (-1)

                if(tradebook.length < 1)
                    return 1 * multiplier;

                if(tradebook[tradebook.length - 1].profit < 0 || tradebook[tradebook.length - 1].profit > 10)
                    return 1 * multiplier;
                else
                {
                    if(profitRate > .9)
                        return tradebook[tradebook.length - 1].amount * 2 * multiplier;
                    else
                        return tradebook[tradebook.length - 1].amount * 3 * multiplier;
                }

            return 0;
            break;

            //Labouchère system / Split martingale / Cancellation system
            case"splitmartingale":
            if(!this.initiationFlag)
            {
                this.remainder = 0.0;
                this.bets = new Array();
                for(var i = 0; i < expectedProfit/profitRate; i++)
                    this.bets[i] = profitRate;
                this.initiationFlag = true;
            }

            if(tradebook.length > 0)
            {
                //if last trade was successful
                if(tradebook[tradebook.length - 1].profit > 0)
                {
                    //this.bets.splice(0, 1);
                    this.bets.shift();
                    this.bets.pop();
                }
                else
                {
                    var previousAmount = tradebook[tradebook.length - 1].amount;
                    var nextStackValue = profitRate;

                    while(nextStackValue + profitRate <= previousAmount)
                    {
                        nextStackValue += profitRate;
                    }

                    this.remainder += previousAmount - nextStackValue;

                    while(this.remainder > profitRate)
                    {
                        nextStackValue += profitRate;
                        this.remainder -= profitRate;
                    }

                    this.bets.push(nextStackValue)
                }
            }
            var profitNeeded =  this.bets[0] + this.bets[this.bets.length-1];
            var needToInvest = profitNeeded / profitRate;
            
            return needToInvest;

            return 0;
            break;

            //splitmartingale modified by name
                        //Labouchère system / Split martingale / Cancellation system
            case"splitmartingale-modified":
            if(!this.initiationFlag)
            {
                this.remainder = 0.0;
                this.bets = new Array();
                for(var i = 0; i < expectedProfit/20; i++)
                    this.bets[i] = expectedProfit/20;
                this.initiationFlag = true;
            }

            if(tradebook.length > 0)
            {
                //if last trade was successful
                if(tradebook[tradebook.length - 1].profit > 0)
                {
                    //this.bets.splice(0, 1);
                    this.bets.shift();
                    this.bets.shift();
                }
                else
                {
                    var previousAmount = tradebook[tradebook.length - 1].amount;
                    var nextStackValue = profitRate;

                    while(nextStackValue + profitRate <= previousAmount)
                    {
                        nextStackValue += profitRate;
                    }

                    this.remainder += previousAmount - nextStackValue;

                    while(this.remainder > profitRate)
                    {
                        nextStackValue += profitRate;
                        this.remainder -= profitRate;
                    }

                    this.bets.push(nextStackValue)
                }
            }
            var profitNeeded =  this.bets[0] + this.bets[1];
            var needToInvest = profitNeeded / profitRate;
            
            return needToInvest;

            return 0;
            break;



            default:
            return 0;
        }
    }
}
