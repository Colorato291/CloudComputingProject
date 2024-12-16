FROM openalpr/openalpr

# https://github.com/openalpr/openalpr/issues/766
RUN apt update && apt install -y libtool automake
RUN wget https://github.com/tesseract-ocr/tesseract/archive/4.0.0.tar.gz \
    && tar -xzf 4.0.0.tar.gz \
    && cd tesseract-4.0.0 \
    && ./autogen.sh \
    && ./configure \
    && make -j4 \
    && make install \
    && ldconfig