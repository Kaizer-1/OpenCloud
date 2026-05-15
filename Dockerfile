FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY . .
RUN ./mvnw -pl modules/cloudsim-web -am package -DskipTests -q 2>/dev/null || \
    mvn -pl modules/cloudsim-web -am package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/modules/cloudsim-web/target/cloudsim-web-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
