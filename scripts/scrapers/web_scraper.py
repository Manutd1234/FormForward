import scrapy
from scrapy.crawler import CrawlerProcess
import sys
import json
import logging

class BiomechanicsSpider(scrapy.Spider):
    name = "biomechanics_spider"
    
    def __init__(self, start_urls=None, *args, **kwargs):
        super(BiomechanicsSpider, self).__init__(*args, **kwargs)
        self.start_urls = start_urls.split(',') if start_urls else []

    def parse(self, response):
        title = response.css('title::text').get()
        paragraphs = response.css('p::text').getall()
        content = " ".join(paragraphs)[:1000] # Limit content to 1000 chars
        
        yield {
            'url': response.url,
            'title': title,
            'summary': content,
            'source_type': 'web_article',
            'ok': True
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        urls = sys.argv[1]
        process = CrawlerProcess(settings={
            "LOG_LEVEL": "ERROR",
            "FEEDS": {
                "stdout:": {"format": "json"},
            },
        })
        process.crawl(BiomechanicsSpider, start_urls=urls)
        process.start()
    else:
        print(json.dumps([{"url": "error", "ok": False, "title": "Error", "summary": "No URLs provided"}]))

