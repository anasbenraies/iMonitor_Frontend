import { React, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setDevicesUsages } from '../../features/User'
import { FaRegUserCircle } from "react-icons/fa";
import "./Home.css"
import { Container, Row, Col, Alert, Dropdown } from 'react-bootstrap';
import TheBarChart from '../../Components/TheBarChart';
import TheLineChart from '../../Components/TheLineChart';
import HeatmapU from '../../Components/HeatmapU';
import mqtt from 'mqtt';


/**
 * The Home function is the main component of the application.
 * It handles the rendering of the home page, including the overview and device monitoring sections.
 * It also fetches the device usage data for the current user and updates the state accordingly.
 *
 * @return {JSX.Element} The JSX element representing the home page.
 */
function Home() {
  const dispatch = useDispatch()
  const currentUser = useSelector((state) => state.variables.currentUser)
  // all device usages for the current user
  const devicesUsages = useSelector((state) => state.variables.devicesUsages)
  const [DevicesNumber, setDevicesNumber] = useState(0)
  const [LastDeviceUsage, setLastDeviceUsage] = useState(null)
  const [TotalThisMonth, setTotalThisMonth] = useState(0)
  const [devicesList, setDevicesList] = useState([])
  const [SortedDevicesUsages, setSortedDevicesUsages] = useState([])
  // these device usages to be shown by the Graph
  const [SelectedDeviceUsages, setSelectedDeviceUsages] = useState([])
  // this sets the device usages to be shown by the Graph grouped by date
  const [DeviceUsagesForCharts, setDeviceUsagesForCharts] = useState([])
  // this sets the device usages to be shown by the Heatmap 
  const [SelectedDeviceUsagesForHeatmap, setSelectedDeviceUsagesForHeatmap] = useState([])



const Subscriber=()=>{
    
}




  /**
   * Finds the latest device usage date and sets it as the last device usage.
   *
   * @return {void}
   */
  const LastDeviceUsageDate = () => {
    let LastDeviceUsage_date = devicesUsages[0]?.usageDate;
    let lastUsage = {}
    for (let devicesUsage of devicesUsages) {
      if (LastDeviceUsage_date < devicesUsage.usageDate) {
        LastDeviceUsage_date = devicesUsage.usageDate
        lastUsage = devicesUsage
      }
    }
    setLastDeviceUsage(lastUsage)
  }

  // calculates the energy use for the current month 
  const TotalEneryUse = () => {
    let total = 0
    for (let deviceUsage of devicesUsages) {
      if (deviceUsage.usageDate.split("-")[0] === new Date().getFullYear().toString() && deviceUsage.usageDate.split("-")[1] === ('0' + (new Date().getMonth() + 1).toString())) {
        //console.log(deviceUsage.usageDate)
        total += deviceUsage.energy_usage_in_kwh
      }
    }
    console.log("total this month :", total)
    setTotalThisMonth(parseFloat(total).toFixed(2))
  }


  /*
   * Picks the device usages for the given device ID and sets it as the selected device usages.
   *
   * @param {number} deviceId - The ID of the device to pick usages for
   * @return {void}
   */
  const PickDeviceUsages = (deviceId) => {
    for (let deviceUsages of SortedDevicesUsages) {
      if (deviceUsages[0].device.id === deviceId) {
        setSelectedDeviceUsages(deviceUsages)
        console.log("the selected device usages :", SelectedDeviceUsages)
        break
      }
    }

  }


  useEffect(() => {
    getDeviceUsagesDurationAndEnergyUsageByDate()
  }, [SelectedDeviceUsages])

  /**
   * This function processes the selected device usages by grouping it by date and summing the energy usage and duration in minutes.
   *
   * It first groups the selected device usages by date using the reduce function.
   * Then it converts the grouped object to an array of objects and sorts it by date.
   * Finally, it sets the devices usages for charts in the state.
   *
   * @return {void}
   */
  const getDeviceUsagesDurationAndEnergyUsageByDate = () => {
    const deviceUsagesByDate = SelectedDeviceUsages.reduce((groups, deviceUsage) => {
      const { usageDate, durationInMinutes, energy_usage_in_kwh, device } = deviceUsage
      const key = usageDate
      if (!groups[key]) {
        groups[key] = {
          usageDate,
          durationInMinutes: 0,
          energy_usage_in_kwh: 0,
          deviceId: device.id
        }
      }
      groups[key].durationInMinutes += durationInMinutes
      groups[key].energy_usage_in_kwh = groups[key].energy_usage_in_kwh + parseFloat(energy_usage_in_kwh)
      return groups
    }, {})
    const deviceUsagesByDateList = Object.values(deviceUsagesByDate).slice(-7)
    setDeviceUsagesForCharts(deviceUsagesByDateList)

    console.log("deviceUsagesByDateList", deviceUsagesByDateList)
  }


  /**
   * This function processes the device usages data by grouping it by date and counting the number of devices used on each day.
   *
   * It first groups the device usages by date using the reduce function.
   * Then it converts the grouped object to an array of objects and sorts it by date.
   * Finally, it sets the devices usages for heatmap in the state.
   *
   * @return {void}
   */
  const getDevicesUsagesForHeatmap = () => {

    const devicesUsagesForHeatmap = devicesUsages.reduce((groups, deviceUsage) => {
      const { usageDate } = deviceUsage
      const key = usageDate.split("-").join("/")
      if (!groups[key]) {
        groups[key] = new Set()
      }
      groups[key].add(deviceUsage.device.id)
      return groups
    }, {})
    const devicesUsagesForHeatmapList = Object.entries(devicesUsagesForHeatmap).map(([key, value]) => ({
      date: key,
      count: value.size
    }))
    console.log("devicesUsagesForHeatmapList", devicesUsagesForHeatmapList)
    setSelectedDeviceUsagesForHeatmap(devicesUsagesForHeatmapList)
  }



  // useEffect hook for data fetching the Device usage of the current user with his iD 
  useEffect(() => {
    async function getDeviceUsage() {
      try {
        //put the right api uri
        const res = await fetch(`http://localhost:8081/ressources/devicesUsages/${currentUser.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.token}`
          }
        })
        const data = await res.json()
        if (res.status === 200 && data) {
          console.log(data)
          dispatch(setDevicesUsages(data))
        }
      } catch (err) {
        console.log("erreur : " + err)
      }
    }
    getDeviceUsage()

  }, [dispatch]);


  useEffect(() => {
    /**
     * This function processes the device usages data by grouping it by device id and sorting it by date.
     *
     * It first checks if there are any device usages available. If there are, it calls the LastDeviceUsageDate and TotalEneryUse functions.
     * Then, it groups the device usages by device id using the reduce function.
     * After grouping, it converts the grouped object to an array of arrays and sorts each inner array by usage date.
     * Finally, it sets the devices number and sorted devices usages in the state.
     *
     * @return {void}
     */
    const ProcessingDeviceUsages = () => {
      if (devicesUsages.length > 0) {
        LastDeviceUsageDate()
        TotalEneryUse()
        getDevicesUsagesForHeatmap()
        //Subscriber()
        //Grouping th e device usages by device id
        const groupedDevicesUsages = devicesUsages.reduce((groups, deviceUsage) => {
          const { device } = deviceUsage
          if (!groups[device.id]) {
            groups[device.id] = []
          }
          groups[device.id].push(deviceUsage)
          return groups
        }, {})
        // groupedDevicesUsages = { 1: [deviceUsage1, deviceUsage2], 2: [deviceUsage3, deviceUsage4] }
        console.log("result after grouping", groupedDevicesUsages)


        //Sorting the grouped device usages by date

        // Convert groupedDevicesUsages to an array of arrays this will only use the values of the groupedDevicesUsages
        // [ [deviceUsage1, deviceUsage2], [deviceUsage3, deviceUsage4] ]
        const groupedDevicesArray = Object.values(groupedDevicesUsages);
        console.log("result after converting", groupedDevicesArray);
        setDevicesNumber(groupedDevicesArray.length)
        // Sorting each inner array by usageDate
        groupedDevicesArray.forEach(deviceGroup => {
          deviceGroup.sort((a, b) => new Date(a.usageDate) - new Date(b.usageDate));
        });
        console.log("result after sorting", groupedDevicesArray);
        console.log("length of the sorted array", groupedDevicesArray.length);
        setSortedDevicesUsages(groupedDevicesArray)
        // set the devices list 
        if (groupedDevicesArray.length > 0) {
          const devicesInfo = groupedDevicesArray.map(deviceUsages => ({
            id: deviceUsages[0].device?.id,
            type: deviceUsages[0].device?.type || 'Refresh Page',
            model: deviceUsages[0].device?.model || ''
          }))
          setDevicesList(devicesInfo)
          console.log("devices list", devicesList)
        }

      }
    }
    ProcessingDeviceUsages();

  }, [devicesUsages]);



  return (
    <div>
      <div className='Header'>
        <div className='logoTitle'>
          <h2>iMonitor </h2>
        </div>
        <div className='user-info'>
          <h3>{currentUser.username}</h3>
          <FaRegUserCircle style={{ fontSize: "1.3em", cursor: "pointer" }} />
        </div>
      </div>
      <div className='Overview'>
        <h2 className='moderustic-Title'>Overview</h2>
        <div className='Overview-cards'>
          <Container fluid >
            <Row style={{ marginLeft: "-1.5vw" }}>
              <Col xs={6} md={4} >
                <Alert variant={"success"} >
                  Total Energy use this month : {TotalThisMonth} kWh
                </Alert>
              </Col>
              <Col xs={6} md={4}>
                <Alert variant={"success"} >
                  Total devices : {DevicesNumber}
                </Alert>
              </Col>
              <Col md={4}>
                <Alert variant={"success"} >
                  Last Usage : {LastDeviceUsage?.device?.type ? `${LastDeviceUsage?.device?.type}-` : ''}{LastDeviceUsage?.device?.model ? `${LastDeviceUsage?.device?.model}-` : ''}{LastDeviceUsage?.usageDate}
                </Alert>
              </Col>
            </Row>
          </Container>
        </div>
        <div className='HeatmapContainer'>
          <h2 className='moderustic-Title'>Heatmap</h2>
          <div className='Heatmap'>
            <HeatmapU infos={SelectedDeviceUsagesForHeatmap} />
          </div>
        </div>
      </div>
      <div className="DeviceMonitoring">
        <h2 className='moderustic-Title'>
          Device Monitoring
        </h2>

        <div className="DeviceList">
          <div className='DropdownDeviesList'>
            <Dropdown>
              <Dropdown.Toggle style={{ backgroundColor: "white", borderColor: "black", color: "black" }}>
                {SelectedDeviceUsages.length > 0 ? SelectedDeviceUsages[0]?.device?.type + "-" + SelectedDeviceUsages[0]?.device?.model + "-|ID:" + SelectedDeviceUsages[0]?.device?.id + "|" : "Choose a device"}

              </Dropdown.Toggle>
              <Dropdown.Menu>
                {devicesList.map((device, index) => (
                  <Dropdown.Item onClick={() => PickDeviceUsages(device.id)} key={index}>{device.type}-{device.model}-|ID:{device.id}|</Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>
      <div className='ChartsTitles'>
        <h4>Usage duration</h4>
        <h4>Energy usage</h4>
      </div>
      <div className='Charts'>
        <TheBarChart data={DeviceUsagesForCharts} />
        <TheLineChart data={DeviceUsagesForCharts} />
      </div>
    </div>
  )
}

export default Home
