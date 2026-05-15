FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY . .
RUN ./mvnw -pl modules/opencloud-web -am package -DskipTests -q 2>/dev/null || \
    mvn -pl modules/opencloud-web -am package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/modules/opencloud-web/target/opencloud-web-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
