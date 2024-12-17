FROM openalpr/openalpr

# https://github.com/openalpr/openalpr/issues/766

# Kompilēšanas procesam nepieciešamo paplašinājumu ielāde
RUN apt update && apt install -y libtool automake
# Tesseract OCR 4.0.0 versijas ielāde un kompilēšana
RUN wget https://github.com/tesseract-ocr/tesseract/archive/4.0.0.tar.gz \
    && tar -xzf 4.0.0.tar.gz \
    && cd tesseract-4.0.0 \
    && ./autogen.sh \
    && ./configure \
    && make -j4 \
    && make install \
    && ldconfig