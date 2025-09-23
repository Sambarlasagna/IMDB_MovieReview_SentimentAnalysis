# IMDB Movie Reviews Sentiment Analysis

##  Classifying a movie review as positive or negative

### Step 1 - Data Processing and Loading
- Loading in the csv contents to Dataframe
- Exploring the data and getting a knowledge of its structure and contents
- The Dataset contains, Reviews and Sentiment
- Reviews is in the form of text , Generally ML models cannot work with texts hence we convert them into numerical form / tokens.
- Sentiment is int he form of text too, positive and negative, we will convert positive to 1 and negative to 0.
- Creating a Dataset class(Pytorch's dataloader wouldd expect a PyTorch Dataset object later)
- putting tokenizing inside __getitem__ of the Dataset class
- Splitting the data into Train set(80%) Test set(10%) and Validation set(10%)
- Since BERT tokenizer already hav fixed vocabulary and special tokens like <pad> and <unk> hence we dont need to assign them.
- Pass in the datasets to Dataloaders 

### Challenges faced in Step 1
- The initial approach I thought was to use torchtext to assign tokens but the torchtext version wasnt compatible with my pre existing torch version.
- Hence I changed the approach to using transformers
- This actually proved to be much more simpler than torchtext 

### Step 2 - Data